// Minimal Turkish location data for cascading selects.
// Extend this list as needed; structure matches city -> district -> neighborhoods.
const LOCATIONS = [
  {
    city: 'İstanbul',
    districts: [
      {
        name: 'Beşiktaş',
        neighborhoods: ['Akatlar', 'Arnavutköy', 'Bebek', 'Etiler', 'Levent', 'Ortaköy', 'Ulus'],
      },
      {
        name: 'Kadıköy',
        neighborhoods: ['Moda', 'Fenerbahçe', 'Suadiye', 'Kozyatağı', 'Caddebostan', 'Göztepe'],
      },
      {
        name: 'Şişli',
        neighborhoods: ['Nişantaşı', 'Bomonti', 'Mecidiyeköy', 'Feriköy'],
      },
    ],
  },
  {
    city: 'Ankara',
    districts: [
      {
        name: 'Çankaya',
        neighborhoods: ['Bahçelievler', 'Kızılay', 'Dikmen', 'Ayrancı', 'Yıldız'],
      },
      {
        name: 'Yenimahalle',
        neighborhoods: ['Batıkent', 'Demetevler', 'Şentepe'],
      },
    ],
  },
  {
    city: 'İzmir',
    districts: [
      {
        name: 'Konak',
        neighborhoods: ['Alsancak', 'Güzelyalı', 'Göztepe', 'Karataş'],
      },
      {
        name: 'Bornova',
        neighborhoods: ['Kazımdirik', 'Erzene', 'Evka-3', 'Atatürk'],
      },
    ],
  },
];

export default LOCATIONS;
