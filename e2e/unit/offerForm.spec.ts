import { expect, test } from '@playwright/test';
import { fromOffer, parseCoords, toCreateBody, toPatchBody, type OfferFormValues } from '../../src/lib/offerForm';
import type { Offer } from '../../src/lib/types';

const offer: Offer = {
  _id: 'o1', brandId: 'b1', title: 'Free coffee', description: 'A cup on us', terms: 'One per person', deliverables: '',
  address: '1 MG Road', location: { type: 'Point', coordinates: [77.59, 12.97] }, discountInr: 150, connectsCost: 40,
  totalCoupons: 20, remainingCoupons: 12, requirements: [{ platform: 'instagram', metric: 'followers', min: 3000, _id: 'r1' } as never],
  fundedBy: 'brand', voucherValidityDays: 7, startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2099-01-01T12:00:00.000Z', status: 'active',
  createdBy: 'a', updatedBy: 'a', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
  venue: { _id: 'b1', name: 'Café X', city: 'Bengaluru' },
};

test('reads pasted coordinates', () => {
  expect(parseCoords('12.97, 77.59')).toEqual({ lat: 12.97, lng: 77.59 });
  expect(parseCoords('12.97')).toBeNull();
  expect(parseCoords('100, 0')).toBeNull();
  expect(parseCoords('1, 200')).toBeNull();
  expect(parseCoords('a, b')).toBeNull();
  expect(parseCoords('1,')).toBeNull();
});

test('builds the create body', () => {
  const v: OfferFormValues = {
    brandId: 'b1', coords: '12.97, 77.59', address: ' 1 MG Road ', discountInr: '150', connectsCost: '40', totalCoupons: '20', fundedBy: 'tazmify',
    voucherValidityDays: '7', startsAt: '2026-11-01T10:00', endsAt: '2026-12-01T10:00',
    requirements: [{ platform: 'instagram', metric: 'followers', min: '3000' }],
    title: ' Free coffee ', description: 'A cup', terms: 'One', deliverables: '',
  };
  expect(toCreateBody(v)).toEqual({
    brandId: 'b1', title: 'Free coffee', description: 'A cup', terms: 'One', deliverables: '', address: '1 MG Road', lat: 12.97, lng: 77.59,
    discountInr: 150, connectsCost: 40, totalCoupons: 20, fundedBy: 'tazmify', voucherValidityDays: 7,
    requirements: [{ platform: 'instagram', metric: 'followers', min: 3000 }],
    startsAt: new Date('2026-11-01T10:00').toISOString(), endsAt: new Date('2026-12-01T10:00').toISOString(),
  });
  expect(() => toCreateBody({ ...v, brandId: '' })).toThrow('Pick a venue');
  expect(() => toCreateBody({ ...v, coords: 'x' })).toThrow('lat, lng');
  expect(() => toCreateBody({ ...v, requirements: [{ platform: 'youtube', metric: 'followers', min: '' }] })).toThrow('minimum');
});

test('sends nothing when nothing changed', () => expect(toPatchBody(offer, fromOffer(offer))).toEqual({}));

test('sends only the changed field', () => {
  expect(toPatchBody(offer, { ...fromOffer(offer), title: 'New title' })).toEqual({ title: 'New title' });
});

test('sends lat and lng together', () => {
  expect(toPatchBody(offer, { ...fromOffer(offer), coords: '13, 77.59' })).toEqual({ lat: 13, lng: 77.59 });
});

test('ignores requirement ids', () => {
  expect(toPatchBody(offer, fromOffer(offer))).toEqual({});
  const v = fromOffer(offer);
  expect(toPatchBody(offer, { ...v, requirements: [{ ...v.requirements[0], min: '4000' }] }))
    .toEqual({ requirements: [{ platform: 'instagram', metric: 'followers', min: 4000 }] });
});

test('never sends startsAt', () => {
  const body = toPatchBody(offer, { ...fromOffer(offer), startsAt: '2030-01-01T00:00', title: 'x', endsAt: '2099-02-01T00:00' });
  expect(body).not.toHaveProperty('startsAt');
  expect(Object.keys(body).sort()).toEqual(['endsAt', 'title']);
});
