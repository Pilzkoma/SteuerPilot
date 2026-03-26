/**
 * SteuerPilot — PDF Export Engine
 *
 * Generiert eine ELSTER-strukturierte Steuer-Zusammenfassung als PDF.
 * Kein Electron. Kein Node. Pure JS — läuft im Renderer.
 *
 * Seitenstruktur:
 *   1. Deckblatt (mit Disclaimer)
 *   2. Übersicht
 *   3. Anlage N
 *   4. Werbungskosten
 *   5. Vorsorge & Sonderausgaben
 *   6. Anlage EÜR (nur wenn Honorar-Einnahmen vorhanden)
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { schaetzeRueckerstattung } from './steuerberechnung.js'

// ── Layout-Konstanten ─────────────────────────────────────────────────────────

const W = 210
const H = 297
const M = 18  // seitlicher Rand

// ── Farbpalette ───────────────────────────────────────────────────────────────

const C = {
  primary:      [30, 58, 95],     // #1E3A5F Dunkelblau
  accent:       [245, 166, 35],   // #F5A623 Warmgelb
  white:        [255, 255, 255],
  light:        [248, 249, 250],
  muted:        [120, 130, 140],
  dark:         [30, 40, 50],
  success:      [40, 140, 60],
  successBg:    [235, 248, 235],
  errorBg:      [255, 235, 235],
  errorText:    [180, 30, 30],
  warnBg:       [255, 248, 220],
  warnText:     [133, 90, 0],
  infoBg:       [235, 242, 252],
  infoText:     [30, 58, 95],
  border:       [220, 225, 230],
  rowEven:      [248, 249, 250],
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function euro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR'
  }).format(value ?? 0)
}

function todayStr() {
  return new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function sumByKat(rows, ...kats) {
  return (rows ?? [])
    .filter(r => kats.includes(r.kategorie))
    .reduce((acc, r) => acc + (r.betrag ?? 0), 0)
}

// ── Kopf- und Fußzeile ────────────────────────────────────────────────────────

function drawHeader(doc, sectionTitle) {
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, 13, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.white)
  doc.text('SteuerPilot', M, 8.5)

  doc.setFont('helvetica', 'normal')
  doc.text(sectionTitle, W / 2, 8.5, { align: 'center' })
  doc.text(todayStr(), W - M, 8.5, { align: 'right' })
}

function drawFooter(doc, pageNum, totalPages) {
  doc.setFillColor(...C.light)
  doc.rect(0, H - 9, W, 9, 'F')
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(M, H - 9, W - M, H - 9)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.muted)
  doc.text(
    'Kein amtliches Dokument — nicht direkt ans Finanzamt senden.',
    M, H - 3.5
  )
  doc.text(`Seite ${pageNum} von ${totalPages}`, W - M, H - 3.5, { align: 'right' })
}

function newPage(doc, sectionTitle) {
  doc.addPage()
  drawHeader(doc, sectionTitle)
  return 21  // startY nach Header
}

// ── Seite 1: Deckblatt ────────────────────────────────────────────────────────

function buildDeckblatt(doc, { nutzer, activeJahr, hasEuer }) {
  drawHeader(doc, '')

  const cx = W / 2
  let y = 46

  // App-Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(...C.primary)
  doc.text('SteuerPilot', cx, y, { align: 'center' })
  y += 11

  // Untertitel
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...C.muted)
  doc.text(`Steuer-Zusammenfassung ${activeJahr?.jahr ?? ''}`, cx, y, { align: 'center' })
  y += 16

  // Nutzer-Info
  const name = [nutzer?.vorname, nutzer?.nachname].filter(Boolean).join(' ')
  if (name) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...C.dark)
    doc.text(name, cx, y, { align: 'center' })
    y += 6
  }
  if (nutzer?.steuer_id) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(`Steuer-ID: ${nutzer.steuer_id}`, cx, y, { align: 'center' })
    y += 6
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text(`Erstellt am ${todayStr()}`, cx, y, { align: 'center' })
  y += 22

  // ── WICHTIGER HINWEIS (Disclaimer) ────────────────────────────────────────
  const bx = M
  const bw = W - 2 * M
  const bh = 48

  // Hintergrund
  doc.setFillColor(...C.warnBg)
  doc.roundedRect(bx, y, bw, bh, 3, 3, 'F')

  // Linker Akzentstreifen
  doc.setFillColor(...C.accent)
  doc.rect(bx, y, 4.5, bh, 'F')

  // Titel
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.warnText)
  doc.text('⚠  Wichtiger Hinweis', bx + 9, y + 9)

  // Disclaimer-Text (4 Zeilen)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 60, 0)

  const lines = [
    'Dieses Dokument ist kein offizielles Steuerformular und kann nicht direkt an das Finanzamt',
    'gesendet werden. Es dient ausschließlich als persönliche Arbeitsunterlage.',
    'Übertrage die Angaben selbst in ELSTER (www.elster.de) oder eine Steuersoftware (z. B. WISO).',
    'Alle Angaben ohne Gewähr. Für verbindliche Auskünfte wende dich an einen Steuerberater.'
  ]
  let ty = y + 18
  for (const line of lines) {
    doc.text(line, bx + 9, ty)
    ty += 6
  }

  y += bh + 18

  // Trennlinie
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.4)
  doc.line(M, y, W - M, y)
  y += 10

  // Inhaltsverzeichnis
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.dark)
  doc.text('Inhalt dieser Zusammenfassung', M, y)
  y += 8

  const sections = [
    ['Seite 2', 'Übersicht — Wichtigste Kennzahlen'],
    ['Seite 3', 'Anlage N — Einkünfte aus nichtselbstständiger Arbeit'],
    ['Seite 4', 'Werbungskosten aufgeschlüsselt nach Kategorie'],
    ['Seite 5', 'Vorsorgeaufwendungen & Sonderausgaben'],
    ...(hasEuer ? [['Seite 6', 'Anlage EÜR — Einnahmen-Überschuss-Rechnung']] : [])
  ]

  for (const [pg, label] of sections) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...C.accent)
    doc.text(pg, M + 2, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.dark)
    doc.text(label, M + 17, y)
    y += 6.5
  }
}

// ── Seite 2: Übersicht ────────────────────────────────────────────────────────

function buildUebersicht(doc, { activeJahr, totals, ergebnis }) {
  let y = newPage(doc, 'Übersicht')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.primary)
  doc.text(`Übersicht Steuerjahr ${activeJahr?.jahr ?? ''}`, M, y)
  y += 10

  const anzusetzend = totals.werbungskosten > 1230 ? totals.werbungskosten : 1230

  const body = [
    ['Gesamte Einnahmen', euro(totals.einnahmen), ''],
    ['Davon: Lohn / Gehalt', euro(totals.lohnEinnahmen), totals.lohnEinnahmen > 0 ? 'Anlage N' : 'Nicht erfasst'],
    ['Davon: Honorare / Selbstständig', euro(totals.honorarEinnahmen), totals.honorarEinnahmen > 0 ? 'Anlage EÜR' : 'Nicht erfasst'],
    ['', '', ''],
    ['Werbungskosten erfasst', euro(totals.werbungskosten), totals.werbungskosten > 1230 ? '✓ Über Pauschbetrag (1.230 €)' : 'Pauschbetrag (1.230 €) wird angesetzt'],
    ['Effektiv ansetzbarer Betrag', euro(anzusetzend), ''],
    ['Vorsorgeaufwendungen', euro(totals.vorsorge), totals.vorsorge > 0 ? 'Anlage Vorsorgeaufwand' : 'Nicht erfasst'],
    ['Sonderausgaben / Spenden', euro(totals.sonderausgaben), totals.sonderausgaben > 0 ? 'Anlage Sonderausgaben' : 'Nicht erfasst'],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Position', 'Betrag', 'Hinweis']],
    body,
    theme: 'striped',
    headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: C.dark, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 'auto', fontSize: 7, textColor: C.muted }
    },
    alternateRowStyles: { fillColor: C.rowEven },
    margin: { left: M, right: M }
  })

  y = doc.lastAutoTable.finalY + 12

  // Schätzungs-Box
  if (ergebnis) {
    const ist = ergebnis.geschaetzteRueckerstattung > 0
    const fg = ist ? C.successBg : C.errorBg
    const tc = ist ? C.success : C.errorText

    doc.setFillColor(...fg)
    doc.roundedRect(M, y, W - 2 * M, 30, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...tc)
    doc.text(
      ist ? 'Voraussichtliche Rückerstattung' : 'Voraussichtliche Nachzahlung',
      M + 8, y + 9
    )
    doc.setFontSize(19)
    doc.text(euro(Math.abs(ergebnis.geschaetzteRueckerstattung)), M + 8, y + 22)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.text(
      'Schätzung ohne Gewähr — basierend auf erfassten Daten.\nKeine verbindliche Steuerberatung.',
      W - M - 5, y + 14,
      { align: 'right', maxWidth: 80 }
    )
    y += 36
  } else {
    doc.setFillColor(...C.light)
    doc.roundedRect(M, y, W - 2 * M, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text(
      'ℹ  Keine Schätzung möglich — trage deine Einnahmen und Lohnsteuer im Dateneingabe-Wizard ein.',
      M + 5, y + 9
    )
    y += 22
  }

  // Hinweis auf Lohnsteuer-Daten
  if (!totals.lohnsteuer) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text(
      'Hinweis: Lohnsteuer-Daten nicht erfasst — Schätzung basiert nur auf Bruttoeinnahmen.',
      M, y
    )
  }
}

// ── Seite 3: Anlage N ─────────────────────────────────────────────────────────

function buildAnlageN(doc, { activeJahr, totals, nutzer }) {
  let y = newPage(doc, 'Anlage N')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.primary)
  doc.text('Anlage N', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text('Einkünfte aus nichtselbstständiger Arbeit', M, y + 6)
  y += 14

  // Infobox
  doc.setFillColor(...C.infoBg)
  doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.infoText)
  doc.text(
    'Trage diese Werte in ELSTER unter "Anlage N" ein. Die Zeilennummern beziehen sich auf das amtliche Formular.',
    M + 5, y + 5.5
  )
  doc.text(
    'Die genauen Beträge findest du auf deiner Lohnsteuerbescheinigung (jährlich vom Arbeitgeber).',
    M + 5, y + 10.5
  )
  y += 20

  const anzusetzend = Math.max(totals.werbungskosten, 1230)

  autoTable(doc, {
    startY: y,
    head: [['ELSTER-Feld', 'Bezeichnung', 'Dein Wert', 'Erläuterung']],
    body: [
      [
        'Anlage N, Z. 6–9',
        'Bruttoarbeitslohn',
        euro(totals.lohnEinnahmen),
        'Von der Lohnsteuerbescheinigung (Kennzahl 3)'
      ],
      [
        'Anlage N, Z. 40',
        'Einbehaltene Lohnsteuer',
        totals.lohnsteuer ? euro(totals.lohnsteuer) : '— *',
        'Von der Lohnsteuerbescheinigung (Kennzahl 4)'
      ],
      [
        'Anlage N, Z. 41',
        'Einbehaltener Solidaritätszuschlag',
        totals.soli ? euro(totals.soli) : '— *',
        'Von der Lohnsteuerbescheinigung (Kennzahl 5)'
      ],
      [
        'Anlage N, Z. 42',
        'Einbehaltene Kirchensteuer',
        totals.kirchensteuer ? euro(totals.kirchensteuer) : '—',
        'Von der Lohnsteuerbescheinigung (Kennzahl 6/7), falls zutreffend'
      ],
      [
        'Anlage N, Z. 31',
        'Werbungskosten (ansetzbarer Betrag)',
        euro(anzusetzend),
        totals.werbungskosten > 1230
          ? `Deine Kosten (${euro(totals.werbungskosten)}) > Pauschbetrag → voller Betrag ansetzbar`
          : `Pauschbetrag greift (1.230 €), deine Kosten: ${euro(totals.werbungskosten)}`
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: C.dark, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold', textColor: C.accent },
      1: { cellWidth: 54 },
      2: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 'auto', fontSize: 7, textColor: C.muted }
    },
    alternateRowStyles: { fillColor: C.rowEven },
    margin: { left: M, right: M }
  })

  y = doc.lastAutoTable.finalY + 10

  // Steuer-ID
  if (nutzer?.steuer_id) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(`Deine Steuer-ID (für ELSTER-Anmeldung): ${nutzer.steuer_id}`, M, y)
    y += 8
  }

  // Fußnote fehlende Daten
  if (!totals.lohnsteuer || !totals.soli) {
    doc.setFillColor(...C.warnBg)
    doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.warnText)
    doc.text(
      '* Mit "—" markierte Felder wurden nicht im Dateneingabe-Wizard erfasst. Trage diese Werte',
      M + 5, y + 5
    )
    doc.text(
      '  direkt aus deiner Lohnsteuerbescheinigung in ELSTER ein.',
      M + 5, y + 10
    )
    y += 18
  }

  // Lohnsteuerbescheinigung Hinweis
  y += 4
  doc.setFillColor(248, 249, 250)
  doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.dark)
  doc.text('Wo finde ich meine Lohnsteuerbescheinigung?', M + 5, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text(
    'Dein Arbeitgeber übermittelt die Lohnsteuerbescheinigung jährlich elektronisch ans Finanzamt.',
    M + 5, y + 12
  )
  doc.text(
    'Du erhältst eine Papierkopie oder kannst sie über ELSTER → "Vorausgefüllte Steuererklärung" abrufen.',
    M + 5, y + 18
  )
}

// ── Seite 4: Werbungskosten ───────────────────────────────────────────────────

function buildWerbungskosten(doc, { activeJahr, ausgabenRows, totals }) {
  let y = newPage(doc, 'Werbungskosten')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.primary)
  doc.text('Werbungskosten', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text(`Steuerjahr ${activeJahr?.jahr ?? ''} — Aufschlüsselung nach Kategorie`, M, y + 6)
  y += 14

  const ELSTER_MAP = {
    fahrtkosten:       { label: 'Fahrtkosten (Wohnung ↔ Arbeitsstätte)', zeile: 'Anlage N, Z. 31/35', tip: '0,30 €/km (1–20 km) · 0,38 €/km (ab 21 km) × Arbeitstage' },
    homeoffice:        { label: 'Homeoffice-Pauschale',                   zeile: 'Anlage N, Z. 44',    tip: '6 €/Tag · max. 210 Tage = max. 1.260 €/Jahr' },
    arbeitsmittel:     { label: 'Arbeitsmittel',                          zeile: 'Anlage N, Z. 48',    tip: 'Fachliteratur, Hard-/Software, Büromaterial; Freigrenze 952 €' },
    sonstige:          { label: 'Sonstige Werbungskosten',                zeile: 'Anlage N, Z. 49–57', tip: 'Fortbildungen, Berufsverbände, Berufskleidung etc.' },
  }

  const byKat = {}
  for (const row of (ausgabenRows ?? [])) {
    const k = row.kategorie ?? 'sonstige'
    if (!byKat[k]) byKat[k] = []
    byKat[k].push(row)
  }

  const tableBody = []
  for (const [kat, info] of Object.entries(ELSTER_MAP)) {
    const sum = (byKat[kat] ?? []).reduce((acc, r) => acc + (r.betrag ?? 0), 0)
    if (sum > 0) {
      tableBody.push([info.label, info.zeile, euro(sum), info.tip])
    }
  }

  if (tableBody.length === 0) {
    doc.setFillColor(...C.light)
    doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text('Keine Werbungskosten erfasst.', M + 5, y + 9)
    y += 20
  } else {
    // Gesamt-Zeile
    tableBody.push([
      { content: 'Gesamt Werbungskosten', styles: { fontStyle: 'bold' } },
      '',
      { content: euro(totals.werbungskosten), styles: { fontStyle: 'bold', halign: 'right' } },
      ''
    ])

    autoTable(doc, {
      startY: y,
      head: [['Kategorie', 'ELSTER-Feld', 'Betrag', 'Erläuterung']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.dark, cellPadding: 3.5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 38, fontSize: 7.5, textColor: C.accent, fontStyle: 'bold' },
        2: { cellWidth: 27, halign: 'right' },
        3: { cellWidth: 'auto', fontSize: 7, textColor: C.muted }
      },
      alternateRowStyles: { fillColor: C.rowEven },
      margin: { left: M, right: M }
    })

    y = doc.lastAutoTable.finalY + 10
  }

  // Pauschbetrag-Vergleich
  const ueber = totals.werbungskosten > 1230
  doc.setFillColor(...(ueber ? C.successBg : C.light))
  doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...(ueber ? C.success : C.dark))
  doc.text(
    ueber
      ? `✓ Deine Werbungskosten (${euro(totals.werbungskosten)}) übersteigen den Arbeitnehmer-Pauschbetrag (1.230 €).`
      : `ℹ Deine Werbungskosten (${euro(totals.werbungskosten)}) liegen unter dem Arbeitnehmer-Pauschbetrag (1.230 €).`,
    M + 5, y + 8
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text(
    ueber
      ? `ELSTER setzt deine Kosten an. Du sparst ${euro(totals.werbungskosten - 1230)} mehr als mit dem Pauschbetrag.`
      : 'ELSTER setzt automatisch 1.230 € an — auch ohne Einzelbelege. Trotzdem alle Belege aufbewahren.',
    M + 5, y + 16
  )
  y += 28

  // Einzelne Belege als Detail-Liste (kompakt)
  const werbKats = ['fahrtkosten', 'homeoffice', 'arbeitsmittel', 'sonstige']
  const detailRows = (ausgabenRows ?? [])
    .filter(r => werbKats.includes(r.kategorie) && r.beschreibung)
    .slice(0, 15)

  if (detailRows.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C.dark)
    doc.text('Einzelne Positionen (Auszug)', M, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['Bezeichnung', 'Kategorie', 'Betrag']],
      body: detailRows.map(r => [
        r.beschreibung ?? '—',
        r.kategorie ?? '—',
        euro(r.betrag)
      ]),
      theme: 'plain',
      headStyles: { fillColor: C.light, textColor: C.muted, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: C.dark, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35 },
        2: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: M, right: M }
    })
  }
}

// ── Seite 5: Vorsorge & Sonderausgaben ────────────────────────────────────────

function buildVorsorge(doc, { activeJahr, ausgabenRows, totals }) {
  let y = newPage(doc, 'Vorsorge & Sonderausgaben')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.primary)
  doc.text('Vorsorgeaufwendungen & Sonderausgaben', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text(`Steuerjahr ${activeJahr?.jahr ?? ''}`, M, y + 6)
  y += 14

  const kvTotal  = sumByKat(ausgabenRows, 'krankenversicherung')
  const avTotal  = sumByKat(ausgabenRows, 'altersvorsorge')
  const spTotal  = sumByKat(ausgabenRows, 'spende')

  const tableBody = []
  if (kvTotal > 0) {
    tableBody.push([
      'Krankenversicherung',
      'Anlage Vorsorgeaufwand, Z. 4–7',
      euro(kvTotal),
      'Beiträge zur gesetzl. oder privaten Krankenversicherung (nur Basisschutz)'
    ])
  }
  if (avTotal > 0) {
    tableBody.push([
      'Altersvorsorge',
      'Anlage Vorsorgeaufwand, Z. 8–16',
      euro(avTotal),
      'Riester max. 2.100 €/Jahr · Rürup bis 27.566 €/Jahr (2025)'
    ])
  }
  if (spTotal > 0) {
    tableBody.push([
      'Spenden & Mitgliedsbeiträge',
      'Anlage Sonderausgaben, Z. 5',
      euro(spTotal),
      'Nur steuerbegünstigte Organisationen · max. 20 % der Gesamteinkünfte'
    ])
  }

  if (tableBody.length === 0) {
    doc.setFillColor(...C.light)
    doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text('Keine Vorsorgeaufwendungen oder Sonderausgaben erfasst.', M + 5, y + 9)
    y += 20
  } else {
    tableBody.push([
      { content: 'Gesamt', styles: { fontStyle: 'bold' } },
      '',
      { content: euro(kvTotal + avTotal + spTotal), styles: { fontStyle: 'bold', halign: 'right' } },
      ''
    ])

    autoTable(doc, {
      startY: y,
      head: [['Kategorie', 'ELSTER-Feld', 'Betrag', 'Erläuterung']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: C.dark, cellPadding: 3.5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 42, fontSize: 7.5, textColor: C.accent, fontStyle: 'bold' },
        2: { cellWidth: 27, halign: 'right' },
        3: { cellWidth: 'auto', fontSize: 7, textColor: C.muted }
      },
      alternateRowStyles: { fillColor: C.rowEven },
      margin: { left: M, right: M }
    })
    y = doc.lastAutoTable.finalY + 14
  }

  // Belege-Hinweise
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.dark)
  doc.text('Belege aufbewahren', M, y)
  y += 6

  const hinweise = [
    '• Werbungskosten-Belege: 10 Jahre aufbewahren (Finanzamt kann jederzeit prüfen).',
    '• Vorsorge-Nachweise: Jahresmitteilung vom Versicherer ist ausreichend.',
    '• Spendenquittungen ab 300 €: Original auf Anfrage dem Finanzamt vorlegen.',
    '• Alle Belege müssen in ELSTER nicht hochgeladen werden — nur auf Anfrage.',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  for (const h of hinweise) {
    doc.text(h, M, y)
    y += 5.5
  }

  // Hinweis auf EÜR wenn vorhanden
  if (totals.honorarEinnahmen > 0) {
    y += 6
    doc.setFillColor(...C.infoBg)
    doc.roundedRect(M, y, W - 2 * M, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.infoText)
    doc.text('ℹ  Anlage EÜR auf der nächsten Seite', M + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text(
      `Du hast Honorar-Einnahmen (${euro(totals.honorarEinnahmen)}) erfasst → Anlage EÜR ist relevant.`,
      M + 5, y + 13
    )
  }
}

// ── Seite 6: Anlage EÜR ──────────────────────────────────────────────────────

function buildEuer(doc, { activeJahr, einnahmenRows, ausgabenRows, totals }) {
  let y = newPage(doc, 'Anlage EÜR')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.primary)
  doc.text('Anlage EÜR', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text('Einnahmen-Überschuss-Rechnung (Freiberufler & Selbstständige)', M, y + 6)
  y += 14

  doc.setFillColor(...C.infoBg)
  doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.infoText)
  doc.text('Nur für Einkünfte aus selbstständiger oder freiberuflicher Tätigkeit relevant.', M + 5, y + 5.5)
  doc.text('Die EÜR wird separat in ELSTER übermittelt (Pflicht ab 17.500 € Jahresumsatz).', M + 5, y + 10.5)
  y += 20

  const honorarTotal = sumByKat(einnahmenRows, 'honorar')
  const sonstigeEinnahmen = sumByKat(einnahmenRows, 'sonstige')
  const betriebsausgaben = sumByKat(ausgabenRows, 'arbeitsmittel', 'sonstige')
  const gewinn = (honorarTotal + sonstigeEinnahmen) - betriebsausgaben

  autoTable(doc, {
    startY: y,
    head: [['EÜR-Position', 'ELSTER-Feld', 'Betrag', 'Erläuterung']],
    body: [
      [
        'Betriebseinnahmen (Honorare)',
        'Anlage EÜR, Z. 14',
        euro(honorarTotal),
        'Summe aller Honorar-Einnahmen im Steuerjahr'
      ],
      [
        'Sonstige Betriebseinnahmen',
        'Anlage EÜR, Z. 22',
        euro(sonstigeEinnahmen),
        'Weitere Einnahmen die nicht Lohn/Honorar sind'
      ],
      [
        'Betriebsausgaben',
        'Anlage EÜR, Z. 50',
        euro(betriebsausgaben),
        'Arbeitsmittel, Software, berufliche Ausgaben'
      ],
      [
        { content: gewinn >= 0 ? 'Gewinn (Zeile 91)' : 'Verlust (Zeile 91)', styles: { fontStyle: 'bold' } },
        'Anlage EÜR, Z. 91',
        { content: euro(gewinn), styles: { fontStyle: 'bold', halign: 'right', textColor: gewinn >= 0 ? C.success : C.errorText } },
        gewinn < 0 ? 'Verlust kann mit anderen Einkünften verrechnet werden' : 'Fließt in die Einkommensteuerberechnung ein'
      ]
    ],
    theme: 'striped',
    headStyles: { fillColor: C.primary, textColor: C.white, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: C.dark, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 38, fontSize: 7.5, textColor: C.accent, fontStyle: 'bold' },
      2: { cellWidth: 27, halign: 'right' },
      3: { cellWidth: 'auto', fontSize: 7, textColor: C.muted }
    },
    alternateRowStyles: { fillColor: C.rowEven },
    margin: { left: M, right: M }
  })

  y = doc.lastAutoTable.finalY + 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  const euerHinweise = [
    'Hinweis: Diese EÜR ist eine vereinfachte Übersicht. Nicht berücksichtigt sind ggf.:',
    '  • Abschreibungen (AfA) auf Anlagegüter über 800 € (netto)',
    '  • Umsatzsteuer-Korrekturen (falls du USt-pflichtig bist)',
    '  • Privatnutzungsanteile von Betriebsmitteln (z. B. Computer, Auto)',
    'Für komplexere Situationen empfehlen wir die Beratung durch einen Steuerberater.',
  ]
  for (const h of euerHinweise) {
    doc.text(h, M, y)
    y += 5
  }
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

/**
 * Generiert ein ELSTER-strukturiertes PDF als Uint8Array.
 *
 * @param {object} params
 * @param {object} params.nutzer           - { vorname, nachname, steuer_id }
 * @param {object} params.activeJahr       - { id, jahr }
 * @param {Array}  params.einnahmenRows    - [{ betrag, kategorie, beschreibung }]
 * @param {Array}  params.ausgabenRows     - [{ betrag, kategorie, beschreibung }]
 * @param {object} params.fortschritt      - Wizard-Fortschritt JSON
 * @returns {{ buffer: Uint8Array }}
 */
export function generiereElsterPdf({ nutzer, activeJahr, einnahmenRows, ausgabenRows, fortschritt }) {
  // Totals berechnen
  const lohnEinnahmen    = sumByKat(einnahmenRows, 'lohn')
  const honorarEinnahmen = sumByKat(einnahmenRows, 'honorar')
  const einnahmen        = (einnahmenRows ?? []).reduce((acc, r) => acc + (r.betrag ?? 0), 0)
  const werbungskosten   = sumByKat(ausgabenRows, 'fahrtkosten', 'homeoffice', 'arbeitsmittel', 'sonstige')
  const vorsorge         = sumByKat(ausgabenRows, 'krankenversicherung', 'altersvorsorge')
  const sonderausgaben   = sumByKat(ausgabenRows, 'spende')

  // Wizard-Felder (mehrere mögliche Feldnamen abfangen)
  const f = fortschritt ?? {}
  const lohnsteuer    = f.lohnsteuer ?? f.einbehalteneLoHSt ?? null
  const soli          = f.solidaritaetszuschlag ?? f.soli ?? null
  const kirchensteuer = f.kirchensteuer ?? null

  const totals = {
    einnahmen,
    lohnEinnahmen,
    honorarEinnahmen,
    werbungskosten,
    vorsorge,
    sonderausgaben,
    lohnsteuer,
    soli,
    kirchensteuer,
  }

  // Rückerstattungs-Schätzung
  let ergebnis = null
  if (lohnEinnahmen > 0 && activeJahr?.jahr) {
    try {
      ergebnis = schaetzeRueckerstattung({
        bruttoJahreslohn: lohnEinnahmen,
        einbehalteneLoHSt: lohnsteuer ?? 0,
        werbungskosten,
        sonderausgaben: vorsorge + sonderausgaben,
        jahr: activeJahr.jahr
      })
    } catch {
      ergebnis = null
    }
  }

  const hasEuer = honorarEinnahmen > 0
  const totalPages = hasEuer ? 6 : 5

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  // Seite 1 — Deckblatt
  buildDeckblatt(doc, { nutzer, activeJahr, hasEuer })
  drawFooter(doc, 1, totalPages)

  // Seite 2 — Übersicht
  buildUebersicht(doc, { activeJahr, totals, ergebnis })
  drawFooter(doc, 2, totalPages)

  // Seite 3 — Anlage N
  buildAnlageN(doc, { activeJahr, totals, nutzer })
  drawFooter(doc, 3, totalPages)

  // Seite 4 — Werbungskosten
  buildWerbungskosten(doc, { activeJahr, ausgabenRows, totals })
  drawFooter(doc, 4, totalPages)

  // Seite 5 — Vorsorge & Sonderausgaben
  buildVorsorge(doc, { activeJahr, ausgabenRows, totals })
  drawFooter(doc, 5, totalPages)

  // Seite 6 — Anlage EÜR (nur wenn Honorare vorhanden)
  if (hasEuer) {
    buildEuer(doc, { activeJahr, einnahmenRows, ausgabenRows, totals })
    drawFooter(doc, 6, totalPages)
  }

  return { buffer: doc.output('arraybuffer') }
}
