import { mapTicketmasterEventToSummary } from './catalog.mapper';

describe('mapTicketmasterEventToSummary', () => {
  it('maps a fully-populated Ticketmaster event to a catalog summary', () => {
    const raw = {
      id: 'Z7r9jZ1A7x4jF',
      name: 'Coachella Music Festival',
      dates: { start: { localDate: '2027-04-09', localTime: '18:00:00' } },
      classifications: [{ genre: { name: 'Fairs & Festivals' } }],
      images: [
        { ratio: '3_2', width: 305, url: 'https://example.com/small.jpg' },
        { ratio: '16_9', width: 2048, url: 'https://example.com/large.jpg' },
      ],
      priceRanges: [{ min: 89.5, max: 350 }],
      _embedded: {
        venues: [
          {
            id: 'ZFr9jZdeea',
            name: 'Empire Polo Club',
            city: { name: 'Indio' },
          },
        ],
      },
    };

    const summary = mapTicketmasterEventToSummary(raw);

    expect(summary).toEqual({
      externalId: 'Z7r9jZ1A7x4jF',
      title: 'Coachella Music Festival',
      startDate: '2027-04-09',
      startTime: '18:00:00',
      venueExternalId: 'ZFr9jZdeea',
      venueName: 'Empire Polo Club',
      venueCity: 'Indio',
      imageUrl: 'https://example.com/large.jpg',
      minPriceCents: 8950,
      maxPriceCents: 35000,
      genre: 'Fairs & Festivals',
    });
  });

  it('fills in nulls for a sparse event instead of throwing', () => {
    const raw = { id: 'abc123', name: 'Mystery Show' };

    const summary = mapTicketmasterEventToSummary(raw);

    expect(summary).toEqual({
      externalId: 'abc123',
      title: 'Mystery Show',
      startDate: null,
      startTime: null,
      venueExternalId: null,
      venueName: null,
      venueCity: null,
      imageUrl: null,
      minPriceCents: null,
      maxPriceCents: null,
      genre: null,
    });
  });

  it('picks the widest 16:9 image when several ratios are present', () => {
    const raw = {
      id: 'img-test',
      name: 'Image Test',
      images: [
        { ratio: '16_9', width: 100, url: 'https://example.com/tiny.jpg' },
        {
          ratio: '3_2',
          width: 5000,
          url: 'https://example.com/wrong-ratio.jpg',
        },
        { ratio: '16_9', width: 1024, url: 'https://example.com/medium.jpg' },
      ],
    };

    const summary = mapTicketmasterEventToSummary(raw);

    expect(summary.imageUrl).toBe('https://example.com/medium.jpg');
  });
});
