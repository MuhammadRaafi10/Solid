window.PLACES = [
  { key: 'kampus-pl', name: 'Kampus Pondok Labu', area: 'Fatmawati, Jakarta Selatan', tags: ['dekat kampus', 'santai'], note: 'Aman buat kenalan pertama: tinggal janjian di selasar atau kantin setelah kelas.', color: '#7C9473', q: 'UPN Veteran Jakarta Pondok Labu' },
  { key: 'blok-m', name: 'Blok M', area: 'Kebayoran Baru, Jakarta Selatan', tags: ['makan', 'nongkrong'], note: 'Banyak pilihan tempat makan dan kopi, akses MRT dan bus langsung.', color: '#D96868', q: 'Blok M Jakarta Selatan' },
  { key: 'one-bell-park', name: 'One Bell Park', area: 'Cilandak, Jakarta Selatan', tags: ['nongkrong', 'ngobrol'], note: 'Area Cilandak, masih sekitaran kampus Pondok Labu.', color: '#D49837', q: 'One Bell Park Cilandak' },
  { key: 'citos', name: 'Cilandak Town Square', area: 'Cilandak, Jakarta Selatan', tags: ['makan', 'nongkrong'], note: 'Biasa disebut Citos, di sepanjang Jl. TB Simatupang.', color: '#F8A41E', q: 'Cilandak Town Square' },
  { key: 'pim', name: 'Pondok Indah Mall', area: 'Pondok Indah, Jakarta Selatan', tags: ['mall', 'makan'], note: 'Cocok kalau rencananya jalan bareng satu sore penuh.', color: '#697565', q: 'Pondok Indah Mall' },
  { key: 'kampus-limo', name: 'Kampus Limo', area: 'Limo, Depok', tags: ['dekat kampus'], note: 'Buat anak fakultas yang kelasnya di Limo.', color: '#ECDFCC', q: 'UPN Veteran Jakarta Kampus Limo' },
];

window.PLACES.mapUrl = function (p) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.q);
};
