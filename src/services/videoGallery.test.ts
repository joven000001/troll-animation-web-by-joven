import test from 'node:test';
import assert from 'node:assert/strict';

// Pure logic helper functions for video gallery validation
export function sanitizeVideoMetadata(input: {
  title: string;
  description?: string;
  uploaderName?: string;
  uploaderId?: string;
  tags?: string[];
}) {
  const cleanTitle = (input.title || '').trim().slice(0, 100);
  if (!cleanTitle) {
    throw new Error('Video title is required.');
  }

  const cleanDesc = (input.description || '').trim().slice(0, 1000);
  const cleanUploader = (input.uploaderName || 'Troll Animator').trim().slice(0, 100);
  const cleanUploaderId = (input.uploaderId || 'visitor-anon').trim().slice(0, 128);

  const cleanTags = (input.tags || ['troll', 'video'])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);

  if (cleanTags.length === 0) {
    cleanTags.push('troll', 'video');
  }

  return {
    title: cleanTitle,
    description: cleanDesc,
    uploaderName: cleanUploader,
    uploaderId: cleanUploaderId,
    tags: cleanTags,
  };
}

export function canUserDeleteVideo(
  videoUploaderId: string,
  currentAuthUid?: string | null,
  currentVisitorId?: string | null
): boolean {
  if (currentAuthUid && videoUploaderId === currentAuthUid) {
    return true;
  }
  if (currentVisitorId && videoUploaderId === currentVisitorId) {
    return true;
  }
  return false;
}

test('sanitizeVideoMetadata cleans and bounds fields properly', () => {
  const result = sanitizeVideoMetadata({
    title: '  Epic Troll Dance Animation  ',
    description: '  Very funny celluloid troll meme  ',
    uploaderName: '  Joven Animator  ',
    uploaderId: 'uid-12345',
    tags: ['Troll', 'ANIMATION', '  meme  '],
  });

  assert.equal(result.title, 'Epic Troll Dance Animation');
  assert.equal(result.description, 'Very funny celluloid troll meme');
  assert.equal(result.uploaderName, 'Joven Animator');
  assert.equal(result.uploaderId, 'uid-12345');
  assert.deepEqual(result.tags, ['troll', 'animation', 'meme']);
});

test('sanitizeVideoMetadata throws error on empty title', () => {
  assert.throws(() => {
    sanitizeVideoMetadata({ title: '   ' });
  }, /Video title is required/);
});

test('canUserDeleteVideo enforces ownership integrity', () => {
  // Same authenticated user
  assert.equal(canUserDeleteVideo('user_abc', 'user_abc', null), true);

  // Different authenticated user
  assert.equal(canUserDeleteVideo('user_abc', 'user_other', null), false);

  // Unauthenticated visitor trying to delete someone else's video
  assert.equal(canUserDeleteVideo('user_abc', null, 'visitor_xyz'), false);

  // Same visitor matching their own upload
  assert.equal(canUserDeleteVideo('visitor_xyz', null, 'visitor_xyz'), true);
});
