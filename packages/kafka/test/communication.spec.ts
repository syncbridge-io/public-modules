import { expect } from 'expect';
import { messageData, messageDetails } from '../src/utils/communication.js';

describe('Kafka communication', () => {
  it("should write a message's value as data: bytes and text as they are, the rest as JSON", () => {
    const bytes = Buffer.from([1, 2]);
    expect(messageData(bytes)).toBe(bytes);
    expect(messageData('text')).toBe('text');
    expect(messageData({ id: 1 })).toBe('{"id":1}');
    expect(messageData(undefined)).toBeUndefined();
  });

  it('should tell where a message is', () => {
    expect(messageDetails({ topic: 'orders', partition: 2, offset: 15n })).toBe(
      'orders[2]@15',
    );
    expect(messageDetails({ topic: 'orders' })).toBe('orders');
    expect(messageDetails({})).toBeUndefined();
  });
});
