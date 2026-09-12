/**
 * Verified Mental Well-Being & Crisis Hotlines in Malaysia.
 *
 * CRITICAL VERIFICATION POLICY:
 * Every hotline here must be sourced from official government or verified organization portals.
 * No unverified numbers, placeholders, or speculative lines are permitted.
 *
 * Sources:
 * - HEAL 15555: Kementerian Kesihatan Malaysia (KKM / moh.gov.my)
 * - Befrienders KL: befrienders.org.my
 * - Talian Kasih: Kementerian Pembangunan Wanita, Keluarga dan Masyarakat (KPWKM / kpwkm.gov.my)
 */

export const SUPPORT_HOTLINES = [
  {
    id: 'heal-15555',
    name: 'HEAL Line 15555',
    tagline: 'MOH National Mental Health Crisis Helpline',
    organization: 'Kementerian Kesihatan Malaysia (KKM)',
    phone: '15555',
    telLink: 'tel:15555',
    operatingHours: 'Daily: 8:00 AM – 12:00 Midnight',
    is24x7: false,
    tollFree: true,
    description:
      'Official national psychological first aid and emotional support line operated by certified KKM counsellors.',
    verifiedSource: 'Kementerian Kesihatan Malaysia (moh.gov.my)',
    badge: 'Official KKM',
    color: '#0284C7', // Calming blue
  },
  {
    id: 'befrienders-kl',
    name: 'Befrienders KL',
    tagline: '24/7 Confidential Emotional Support & Crisis Line',
    organization: 'Befrienders Kuala Lumpur',
    phone: '03-76272929',
    displayPhone: '03-7627 2929',
    telLink: 'tel:+60376272929',
    operatingHours: '24 Hours / 7 Days a week',
    is24x7: true,
    tollFree: false,
    description:
      'A safe, caring, and confidential listening ear for anyone in deep emotional pain, loneliness, or crisis.',
    verifiedSource: 'befrienders.org.my',
    badge: '24/7 Available',
    color: '#0D9488', // Calming teal
  },
  {
    id: 'talian-kasih',
    name: 'Talian Kasih 15999',
    tagline: '24/7 Psychosocial Support & Welfare Assistance',
    organization: 'KPWKM (Ministry of Women, Family & Community Development)',
    phone: '15999',
    displayPhone: '15999',
    telLink: 'tel:15999',
    whatsapp: '60192615999',
    displayWhatsapp: '019-261 5999',
    whatsappLink: 'https://wa.me/60192615999?text=Hai%20Talian%20Kasih,%20saya%20memerlukan%20bantuan%20sokongan%20emosi',
    operatingHours: '24 Hours / 7 Days a week',
    is24x7: true,
    tollFree: true,
    description:
      'National psychosocial helpline offering phone and WhatsApp guidance for family, distress, and welfare concerns.',
    verifiedSource: 'kpwkm.gov.my',
    badge: '24/7 & WhatsApp',
    color: '#E11D48', // Warm rose
  },
];
