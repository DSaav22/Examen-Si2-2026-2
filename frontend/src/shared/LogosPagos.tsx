interface LogoPagoProps {
  codigo: string
  className?: string
  size?: number
}

/**
 * Componente que renderiza el logo/insignia visual vectorizado (SVG)
 * fiel a la marca de cada método de pago del sistema en todos los países.
 */
export function LogoPago({ codigo, className, size = 28 }: LogoPagoProps) {
  const s = size
  const key = codigo?.toLowerCase() ?? ''

  switch (key) {
    case 'tarjeta':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#1A1F71" />
          <rect x="5" y="9" width="26" height="18" rx="3" fill="#2E3896" />
          <rect x="5" y="13" width="26" height="4" fill="#0E134E" />
          <circle cx="16" cy="21" r="3.2" fill="#EB001B" />
          <circle cx="20" cy="21" r="3.2" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
      )

    case 'qr_bolivia':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#007934" />
          {/* Estilo Simple QR Bolivia */}
          <rect x="7" y="7" width="9" height="9" rx="1.5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <rect x="9.5" y="9.5" width="4" height="4" fill="#F9A825" />
          <rect x="20" y="7" width="9" height="9" rx="1.5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <rect x="22.5" y="9.5" width="4" height="4" fill="#E53935" />
          <rect x="7" y="20" width="9" height="9" rx="1.5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <rect x="9.5" y="22.5" width="4" height="4" fill="#FFFFFF" />
          <rect x="21" y="21" width="3" height="3" fill="#F9A825" />
          <rect x="25" y="25" width="3" height="3" fill="#FFFFFF" />
        </svg>
      )

    case 'pix':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#32BCAD" />
          <path
            d="M18 10.5L12.5 16L15.3 18.8L18 16.1L20.7 18.8L23.5 16L18 10.5ZM12.5 20L18 25.5L23.5 20L20.7 17.2L18 19.9L15.3 17.2L12.5 20Z"
            fill="#FFFFFF"
          />
        </svg>
      )

    case 'yape':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#742284" />
          {/* Yape Logo morado con gota turquesa */}
          <path
            d="M18 8C14.5 8 11.5 10.8 11.5 14.2C11.5 18.5 18 26.5 18 26.5C18 26.5 24.5 18.5 24.5 14.2C24.5 10.8 21.5 8 18 8Z"
            fill="#00D2B8"
          />
          <circle cx="18" cy="14" r="3" fill="#FFFFFF" />
        </svg>
      )

    case 'plin':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#00C9E8" />
          {/* P de Plin en azul marino profundo */}
          <path
            d="M13 10H19C21.7 10 23.5 11.8 23.5 14.5C23.5 17.2 21.7 19 19 19H16.5V26H13V10ZM16.5 16H18.8C20 16 20.8 15.4 20.8 14.5C20.8 13.6 20 13 18.8 13H16.5V16Z"
            fill="#002D72"
          />
          <circle cx="24.5" cy="11.5" r="2.5" fill="#FF5E00" />
        </svg>
      )

    case 'mercado_pago':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#009EE3" />
          {/* Apretón de manos icónico de Mercado Pago */}
          <path
            d="M10 20C10 17 12.5 15 15 15C16.8 15 18 16 18 17C18 16 19.2 15 21 15C23.5 15 26 17 26 20C26 22.5 24 24.5 21 24.5C19.5 24.5 18.5 23.8 18 23C17.5 23.8 16.5 24.5 15 24.5C12 24.5 10 22.5 10 20Z"
            fill="#FFFFFF"
          />
          <path d="M14 18L18 21.5L22 18" stroke="#009EE3" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )

    case 'paypal':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#003087" />
          <path
            d="M13 11H18.5C21 11 22.8 12.4 22.4 15C22 17.5 20.2 18.8 18 18.8H15.8L14.7 25.5H11.5L13 11Z"
            fill="#0079C1"
          />
          <path
            d="M16 14H21C23.2 14 24.8 15.3 24.4 17.6C24 20 22.2 21.2 20.2 21.2H18.2L17.3 27H14.5L16 14Z"
            fill="#00457C"
            fillOpacity="0.75"
          />
        </svg>
      )

    case 'binance_pay':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#181A20" />
          {/* Rombo Binance Gold */}
          <path d="M18 9L21.5 12.5L18 16L14.5 12.5L18 9Z" fill="#F0B90B" />
          <path d="M11 16L14.5 19.5L11 23L7.5 19.5L11 16Z" fill="#F0B90B" />
          <path d="M25 16L28.5 19.5L25 23L21.5 19.5L25 16Z" fill="#F0B90B" />
          <path d="M18 23L21.5 26.5L18 30L14.5 26.5L18 23Z" fill="#F0B90B" />
          <path d="M18 17.5L20.3 19.8L18 22.1L15.7 19.8L18 17.5Z" fill="#F0B90B" />
        </svg>
      )

    case 'spei':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#1B365D" />
          <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="sans-serif">
            SPEI
          </text>
          <path d="M10 24H26" stroke="#00A859" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )

    case 'pse':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#0C2340" />
          <circle cx="18" cy="18" r="11" fill="#FFFFFF" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#0C2340" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            pse
          </text>
          <path d="M9 18C9 13.5 13.5 9 18 9" stroke="#E31837" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )

    case 'nequi':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#200020" />
          {/* Nequi Magenta / Fucsia */}
          <path d="M11 11H16V25H11V11Z" fill="#FF007A" />
          <path d="M20 11H25V25H20V11Z" fill="#FF007A" />
          <path d="M13 11L23 25H19L11 13V11H13Z" fill="#FF007A" />
        </svg>
      )

    case 'webpay':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#FF4713" />
          <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            webpay
          </text>
          <circle cx="18" cy="24" r="2" fill="#FFFFFF" />
        </svg>
      )

    case 'khipu':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#582C83" />
          <path d="M13 11V25M13 18L23 11M13 18L23 25" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    case 'bizum':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#00A499" />
          <circle cx="15" cy="18" r="4.5" fill="#FFFFFF" />
          <path d="M19 13.5L25 22.5" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      )

    case 'sinpe_movil':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#002F6C" />
          <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fill="#00A3E0" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">
            SINPE
          </text>
          <text x="50%" y="64%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">
            móvil
          </text>
        </svg>
      )

    case 'deuna':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#00E575" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#0A1E3F" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            deuna!
          </text>
        </svg>
      )

    case 'pago_efectivo':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#FFCC00" />
          <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fill="#000000" fontSize="7" fontWeight="900" fontFamily="sans-serif">
            PAGO
          </text>
          <text x="50%" y="64%" dominantBaseline="middle" textAnchor="middle" fill="#D32F2F" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
            EFECTIVO
          </text>
        </svg>
      )

    case 'tigo_money':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#00377B" />
          <circle cx="18" cy="18" r="10" fill="#FFC904" />
          <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="#00377B" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            tiGo
          </text>
        </svg>
      )

    case 'redpagos':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#D9272E" />
          <circle cx="18" cy="18" r="9" fill="#1C3F94" />
          <path d="M14 18H22M18 14V22" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )

    case 'abitab':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#005CA9" />
          <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="#FED100" fontSize="8.5" fontWeight="900" fontFamily="sans-serif">
            Abitab
          </text>
        </svg>
      )

    case 'paycash':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#F47920" />
          <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">
            PayCash
          </text>
        </svg>
      )

    case 'soyfri':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#4A148C" />
          <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="#00E676" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            FRI
          </text>
        </svg>
      )

    case 'puntoxpress':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#E61C24" />
          <path d="M12 18L17 23L24 13" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    case 'akipago':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#0088CC" />
          <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            aki!
          </text>
        </svg>
      )

    case 'yappy':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#00B2E3" />
          <path d="M12 12L18 20V26M24 12L18 20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    case 'punto_pago':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#FF5000" />
          <circle cx="18" cy="18" r="8" fill="#FFFFFF" />
          <circle cx="18" cy="18" r="4.5" fill="#FF5000" />
        </svg>
      )

    case 'banco_popular':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#003865" />
          <path d="M9 25V21M15 25V18M21 25V14M27 25V11" stroke="#00A3E0" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      )

    case 'transfermovil':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#004A99" />
          <rect x="12" y="9" width="12" height="18" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M15 15L21 15M15 18L19 18" stroke="#FFCC00" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )

    case 'enzona':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#ED1C24" />
          <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            ENZONA
          </text>
        </svg>
      )

    case 'moncash':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#E30613" />
          <circle cx="18" cy="18" r="8" fill="#FFFFFF" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#E30613" fontSize="10" fontWeight="900" fontFamily="sans-serif">
            M
          </text>
        </svg>
      )

    case 'pago_movil':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#002D62" />
          <circle cx="18" cy="18" r="10" fill="#F7A800" />
          <path d="M13 18H23M18 13V23" stroke="#002D62" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )

    case 'transferencia':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#37474F" />
          {/* Columnas clásicas de banco */}
          <path d="M7 13L18 8L29 13H7Z" fill="#ECEFF1" />
          <rect x="9.5" y="15" width="3" height="9" fill="#B0BEC5" />
          <rect x="16.5" y="15" width="3" height="9" fill="#B0BEC5" />
          <rect x="23.5" y="15" width="3" height="9" fill="#B0BEC5" />
          <rect x="6" y="25" width="24" height="3" rx="0.5" fill="#ECEFF1" />
        </svg>
      )

    case 'efectivo':
    case 'contra_entrega':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#2E7D32" />
          <rect x="6" y="11" width="24" height="14" rx="2" fill="#388E3C" stroke="#A5D6A7" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="3.5" fill="#A5D6A7" />
        </svg>
      )

    case 'credito':
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#5D4037" />
          <rect x="7" y="10" width="22" height="16" rx="2" stroke="#D7CCC8" strokeWidth="1.5" fill="none" />
          <path d="M11 15H17M11 18H25M11 21H21" stroke="#D7CCC8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )

    default:
      return (
        <svg width={s} height={s} viewBox="0 0 36 36" fill="none" className={className}>
          <rect width="36" height="36" rx="8" fill="#455A64" />
          <circle cx="18" cy="18" r="7" stroke="#ECEFF1" strokeWidth="2" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#ECEFF1" fontSize="9" fontWeight="700">
            $
          </text>
        </svg>
      )
  }
}
