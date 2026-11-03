# Security Specification: Shared Online Video Gallery

## 1. Data Invariants
- **Public Read Access**: All visitors can view any video item in the `/videos/{videoId}` collection.
- **Creator Ownership Integrity**: The `uploaderId` on a newly created video document must match the authenticated user (`request.auth.uid`) if signed in, or be a non-empty string.
- **Deletion Lock**: Only the authenticated creator (`request.auth.uid == resource.data.uploaderId`) is permitted to delete their own video document. Unauthenticated users or other users cannot delete anyone else's videos.
- **Immutability of Core Fields**: Once created, `uploaderId` and `createdAt` cannot be altered.
- **Type & Size Enforcement**: All string fields (`title`, `description`, `uploaderName`, `storageUrl`, etc.) must be bounded strictly by maximum lengths declared in `firebase-blueprint.json` to prevent resource poisoning attacks.

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Delete Attack**: Malicious anonymous client attempts to delete `/videos/vid-123` owned by another creator -> Rejected (PERMISSION_DENIED).
2. **Cross-User Delete Attack**: Authenticated user 'attacker_uid' attempts to delete `/videos/vid-123` where `uploaderId == 'victim_uid'` -> Rejected (PERMISSION_DENIED).
3. **Spoofed Creator Create Attack**: Authenticated user 'user_a' attempts to create a video document with `uploaderId: 'user_b'` -> Rejected (PERMISSION_DENIED).
4. **Oversized Title Buffer Attack**: Payload with `title` string length > 100 characters -> Rejected (PERMISSION_DENIED).
5. **Oversized Description Attack**: Payload with `description` string length > 1000 characters -> Rejected (PERMISSION_DENIED).
6. **Missing Required Fields**: Payload without `storageUrl` or `uploaderName` -> Rejected (PERMISSION_DENIED).
7. **Invalid Media Type Poisoning**: Attempt to insert a document with `type: 'malware'` or `type: 'photo'` into `/videos` -> Rejected (PERMISSION_DENIED).
8. **Shadow Field Injection**: Payload including hidden admin flags like `{ "isAdmin": true, "verified": true }` -> Rejected via strict `hasOnly()` key checking.
9. **Malicious Document ID Path Attack**: Video ID containing non-alphanumeric characters like `../etc/passwd` or oversized strings -> Rejected via `isValidId(videoId)`.
10. **Ownership Hijack on Update**: User attempts to update existing video document and modify `uploaderId` to another user -> Rejected (PERMISSION_DENIED).
11. **Timestamp Manipulation on Update**: User attempts to mutate original `createdAt` timestamp on an existing video -> Rejected (PERMISSION_DENIED).
12. **Oversized Array Tag Flood**: Payload containing more than 20 tags or non-list tags structure -> Rejected (PERMISSION_DENIED).
