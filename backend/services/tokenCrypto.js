const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const secret = process.env.META_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('META_TOKEN_ENCRYPTION_KEY or JWT_SECRET is required to encrypt Meta tokens');
  return crypto.scryptSync(secret, 'metabuddy-meta-token-v1', 32);
}

function encryptMetaToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    accessTokenEncrypted: encrypted.toString('base64'),
    accessTokenIv: iv.toString('base64'),
    accessTokenTag: tag.toString('base64'),
    tokenLastFour: token.slice(-4),
  };
}

function decryptMetaToken(record) {
  if (!record?.accessTokenEncrypted || !record?.accessTokenIv || !record?.accessTokenTag) {
    throw new Error('Meta token is missing encrypted token fields');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(record.accessTokenIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(record.accessTokenTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.accessTokenEncrypted, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = { encryptMetaToken, decryptMetaToken };
