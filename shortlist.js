'use strict';
/* Shortlist domain logic: sanitises the untrusted localStorage payload and
   composes the enquiry text sent to the shop. Pure and DOM-free for testing. */
(function (global) {
  function sanitize(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item.name !== 'string' || !item.name || item.name.length > 120) continue;
      if (typeof item.group !== 'string' || item.group.length > 60) continue;
      if (out.some(existing => existing.name === item.name)) continue;
      const qty = Math.floor(Number(item.qty));
      out.push({
        name: item.name,
        group: item.group,
        qty: Number.isFinite(qty) ? Math.min(20, Math.max(1, qty)) : 1,
      });
      if (out.length >= 20) break;
    }
    return out;
  }
  function buildEnquiry(list, fulfil, name, contact, note, ref) {
    return 'Hello Daisy Daisy,\n\nPlease could you help with these enquiries?\n\n' +
      list.map(item => item.qty + ' × ' + item.name).join('\n') +
      '\n\nCollection or delivery enquiry: ' + fulfil +
      '\nName: ' + name +
      '\nReply to: ' + contact +
      (note ? '\nNotes: ' + note : '') +
      '\n\nReference: ' + ref +
      '\n\nPlease confirm designs, availability, prices and arrangements before anything is reserved or purchased.\n\nThank you.';
  }
  global.DDSanitize = sanitize;
  global.DDBuildEnquiry = buildEnquiry;
})(typeof window !== 'undefined' ? window : globalThis);
