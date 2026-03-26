/**
 * SteuerPilot Kategorisierungs-Engine
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Kategorisiert Transaktionen anhand von Empfänger + Verwendungszweck.
 */

const REGELN = [
  {
    pattern: /deutsche bahn|db fernverkehr|db bahn|flixbus|fernbus|lufthansa|ryanair|easyjet|condor|eurowings|wizz air|uber|cabify|taxi|mvv|bvg|hvv|vrs|rmv|vvs|kvb|s-bahn|nahverkehr|üstra|ssb |haltestellenticket/i,
    kategorie: 'fahrtkosten',
    abzugsfaehig: 1
  },
  {
    pattern: /amazon|mediamarkt|media markt|saturn |otto\.|cyberport|notebooksbilliger|alternate|conrad |reichelt|apple store|apple\.com|microsoft|adobe|jetbrains|logitech|cherry|wacom|epson|brother|lenovo|dell|hp inc|hewlett|corsair/i,
    kategorie: 'arbeitsmittel',
    abzugsfaehig: 1
  },
  {
    pattern: /techniker krankenkasse|\btk\b|barmer|\baok\b|\bdak\b|\bikk\b|\bbkk\b|hkk|knappschaft|signal iduna|allianz leben|debeka|mecklenburgische|continentale|hanse merkur|krankenkasse beitrag/i,
    kategorie: 'krankenversicherung',
    abzugsfaehig: 1
  },
  {
    pattern: /rentenversicherung|\bdrv\b|riester|rürup|pensionskasse|betriebsrente|\bvbl\b|zurich leben|swiss life|stuttgarter leben|allianz rente/i,
    kategorie: 'altersvorsorge',
    abzugsfaehig: 1
  },
  {
    pattern: /spende|donation|caritas|diakonie|rotes kreuz|deutsches rotes kreuz|unicef|greenpeace|\bwwf\b|amnesty|misereor|brot für die welt|kindernothilfe|ärzte ohne grenzen/i,
    kategorie: 'spende',
    abzugsfaehig: 1
  },
  {
    pattern: /paypal|klarna|sofort\.|giropay|paydirekt/i,
    kategorie: 'sonstige',
    abzugsfaehig: 0
  }
]

/**
 * Kategorisiert eine Transaktion anhand von Empfänger und Verwendungszweck.
 * Gibt immer eine Kategorie zurück — im Zweifel 'sonstige'.
 *
 * @param {{ empfaenger?: string, verwendungszweck?: string }} param0
 * @returns {{ kategorie: string, abzugsfaehig: number }}
 */
export function kategorisiereTransaktion({ empfaenger = '', verwendungszweck = '' }) {
  const suchtext = `${empfaenger} ${verwendungszweck}`
  for (const regel of REGELN) {
    if (regel.pattern.test(suchtext)) {
      return { kategorie: regel.kategorie, abzugsfaehig: regel.abzugsfaehig }
    }
  }
  return { kategorie: 'sonstige', abzugsfaehig: 0 }
}
