export function formatNotificationBody(body) {
  if (!body || typeof body !== 'string') return body || '';
  if (body.startsWith('__AMO_ATTACHMENT__:')) {
    try {
      const jsonStr = body.replace('__AMO_ATTACHMENT__:', '');
      const attachment = JSON.parse(jsonStr);
      const type = attachment.type || 'file';
      switch (type) {
        case 'image': return 'Photo';
        case 'video': return 'Video';
        case 'location': return 'Location';
        case 'contact': return 'Contact';
        case 'document': return 'Document';
        default: return 'Attachment';
      }
    } catch (e) {
      return 'Attachment';
    }
  }
  return body;
}
