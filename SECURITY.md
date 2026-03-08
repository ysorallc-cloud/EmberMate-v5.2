# EmberMate V5 Security Documentation

## Overview

EmberMate V5 implements comprehensive security measures to protect sensitive health information with strong local encryption and on-device storage.

---

## Security Architecture

### 1. Data Encryption

#### **At Rest Encryption**
- **Implementation**: `utils/secureStorage.ts`
- **Method**: AES-256 encryption for sensitive data
- **Key Storage**: Device keychain/keystore (expo-secure-store)
- **Coverage**:
  - Medications and dosages
  - Appointment details
  - Patient information
  - Medical notes
  - Audit logs

#### **Key Management**
- Master encryption key generated on first use
- Stored securely in device keychain
- Never transmitted or logged
- Automatic key rotation capability

```typescript
// Usage example
import { setSecureItem, getSecureItem } from './utils/secureStorage';

// Store encrypted data
await setSecureItem('@sensitive_data', patientInfo);

// Retrieve and decrypt
const data = await getSecureItem('@sensitive_data');
```

---

### 2. Authentication & Access Control

#### **Biometric Authentication**
- **Implementation**: `utils/biometricAuth.ts`
- **Supported Methods**:
  - Face ID (iOS)
  - Touch ID (iOS)
  - Fingerprint (Android)
  - Iris scan (Android)

#### **PIN Fallback**
- 4-6 digit PIN code
- SHA-256 hashed storage
- Stored in secure keychain
- 5 attempts before lockout

#### **Session Management**
- Automatic timeout after inactivity
- Default: 5 minutes (configurable)
- Secure session token generation
- Force re-authentication after timeout

```typescript
// Enable biometric auth
import { enableBiometricAuth } from './utils/biometricAuth';
await enableBiometricAuth();

// Set up PIN
import { setupPIN } from './utils/biometricAuth';
await setupPIN('1234');
```

---

### 3. Audit Logging

#### **Event Tracking**
- **Implementation**: `utils/auditLog.ts`
- **Logged Events**:
  - Authentication attempts (success/failure)
  - Data access (screens viewed)
  - Data modifications (create/update/delete)
  - Security events (lockouts, breaches)
  - Backup/restore operations
  - Settings changes

#### **Log Security**
- Encrypted storage
- Automatic metadata sanitization
- PII redaction
- Retention limit: 1000 most recent entries

#### **Severity Levels**
- **INFO**: Normal operations
- **WARNING**: Suspicious activity
- **CRITICAL**: Security breaches

```typescript
// Log audit event
import { logAuditEvent, AuditEventType, AuditSeverity } from './utils/auditLog';

await logAuditEvent(
  AuditEventType.MEDICATION_CREATED,
  'New medication added',
  AuditSeverity.INFO,
  { medicationId: 'abc123' }
);
```

---

### 4. Data Backup Security

#### **Encrypted Backups**
- **Implementation**: `utils/dataBackup.ts`
- **Features**:
  - Optional password-based encryption
  - SHA-256 checksum validation
  - Version control
  - Tamper detection

#### **Backup Structure**
```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-03T14:30:00.000Z",
  "encrypted": true,
  "checksum": "a3f5c...",
  "data": { ... }
}
```

#### **Backup Best Practices**
- Always encrypt backups containing PHI
- Store backups in secure locations
- Verify checksum before restore
- Delete old backups securely

---

## Security Features by Category

### **Authentication**
✅ Biometric authentication (Face ID/Touch ID/Fingerprint)
✅ PIN code fallback (SHA-256 hashed)
✅ Auto-lock after inactivity
✅ Session management
✅ Failed attempt lockout

### **Data Protection**
✅ AES-256 encryption at rest
✅ Secure key storage (keychain)
✅ Encrypted backups
✅ Data integrity checksums
✅ Secure deletion (overwrite)

### **Access Control**
✅ Screen-level access logging
✅ Operation-level permissions
✅ Session timeout
✅ Re-authentication for sensitive ops

### **Audit & Compliance**
✅ Comprehensive audit logging
✅ Tamper-evident logs
✅ PII redaction
✅ Retention policies
✅ Export capabilities

### **Additional Protections**
✅ Input sanitization
✅ SQL injection prevention
✅ XSS protection
✅ No network transmission (local-only)

---

## Security Best Practices

### **For Users**

1. **Enable Biometric Authentication**
   - Go to Settings → Security
   - Enable Face ID/Touch ID
   - Set up PIN fallback

2. **Regular Backups**
   - Create encrypted backups weekly
   - Store in secure cloud (iCloud/Google Drive)
   - Verify backups periodically

3. **Device Security**
   - Keep device OS updated
   - Use strong device passcode
   - Enable remote wipe capability

4. **Data Hygiene**
   - Review audit logs monthly
   - Clear old data regularly
   - Verify no unauthorized access

### **For Developers**

1. **Encryption**
   - Always use `setSecureItem()` for sensitive data
   - Never store PHI in plain AsyncStorage
   - Rotate encryption keys periodically

2. **Authentication**
   - Require auth for sensitive screens
   - Log all authentication attempts
   - Implement proper session management

3. **Audit Logging**
   - Log all data modifications
   - Sanitize metadata automatically
   - Monitor for suspicious patterns

4. **Testing**
   - Test encryption/decryption
   - Verify auth flows
   - Check audit log accuracy
   - Penetration testing

---

## Security Settings (User-Facing)

### **Security Tab in Settings**

#### App Lock
- Enable/Disable biometric authentication
- Set up PIN code
- Configure auto-lock timeout
- View last login time

#### Data Protection
- View encryption status
- Create encrypted backup
- Restore from backup
- Clear all data (factory reset)

#### Audit & Activity
- View recent activity
- Export audit logs
- Review security events
- Check failed login attempts

---

## Threat Model

### **Threats Mitigated**

| Threat | Mitigation |
|--------|-----------|
| Device theft | Biometric lock, encryption |
| Unauthorized access | PIN/biometric auth |
| Data breach | Encryption at rest |
| Backup interception | Encrypted backups |
| Insider threats | Audit logging |
| Data tampering | Checksums, audit logs |
| Session hijacking | Timeout, secure tokens |
| Brute force | Attempt limits |

### **Residual Risks**

- **Physical device access**: If attacker has both device and biometric/PIN
- **Malware**: Device-level malware could compromise keychain
- **Social engineering**: User sharing backup passwords
- **Cloud storage**: Backups stored insecurely by user

---

## Compliance

### **HIPAA Considerations**

EmberMate V5 implements technical safeguards aligned with HIPAA requirements:

- ✅ **Access Control**: Unique user authentication
- ✅ **Audit Controls**: Comprehensive activity logs
- ✅ **Integrity**: Data integrity checksums
- ✅ **Transmission Security**: No network transmission (N/A)
- ✅ **Encryption**: Strong encryption (AES-256)

**Note**: Full HIPAA compliance requires organizational policies beyond technical implementation.

---

## Security Incident Response

### **If Unauthorized Access Suspected**

1. Lock the app immediately
2. Review audit logs for suspicious activity
3. Create encrypted backup of current data
4. Change PIN code
5. Re-enable biometric authentication
6. Consider factory reset if compromised

### **Reporting Issues**

Security issues should be reported to:
- Email: security@embermate.com
- GitHub: (private security advisory)

---

## Security Roadmap

### **Implemented**
- ✅ Biometric authentication
- ✅ Data encryption
- ✅ Audit logging
- ✅ Encrypted backups
- ✅ Session management

### **Planned**
- 🔄 End-to-end encryption for cloud sync
- 🔄 Two-factor authentication
- 🔄 Hardware security module (HSM) support
- 🔄 Automated threat detection
- 🔄 Security key integration (YubiKey)

---

## Security Checklist

### **Before Release**
- [ ] Security audit completed
- [ ] Penetration testing passed
- [ ] All sensitive data encrypted
- [ ] Audit logging tested
- [ ] Authentication flows verified
- [ ] Backup encryption tested
- [ ] Session timeout working
- [ ] Failed attempt lockout verified

### **Regular Maintenance**
- [ ] Review audit logs weekly
- [ ] Update security dependencies monthly
- [ ] Rotate encryption keys quarterly
- [ ] Security training annually
- [ ] Penetration testing annually

---

## Technical Details

### **Encryption Specifications**
- **Algorithm**: AES-256-CBC
- **Key Length**: 256 bits
- **IV**: Random, 128 bits per encryption
- **Key Derivation**: SHA-256 hashing
- **Padding**: PKCS#7

### **Hashing Specifications**
- **Algorithm**: SHA-256
- **Use Cases**: PIN storage, checksums
- **Salt**: Unique per-item (where applicable)

### **Session Management**
- **Token Length**: 256 bits (32 bytes)
- **Token Generation**: Crypto-secure random
- **Storage**: Device keychain
- **Timeout**: Configurable (default 300s)

---

## Code Examples

### **Protecting Sensitive Data**

```typescript
// BAD - Plain storage
await AsyncStorage.setItem('patient_ssn', '123-45-6789');

// GOOD - Encrypted storage
await setSecureItem('patient_ssn', '123-45-6789');
```

### **Requiring Authentication**

```typescript
import { requireAuthentication } from './utils/biometricAuth';

async function viewSensitiveData() {
  const authenticated = await requireAuthentication();

  if (!authenticated) {
    // Show lock screen
    return;
  }

  // Proceed with sensitive operation
  await logDataAccess('patient-profile');
}
```

### **Logging Sensitive Operations**

```typescript
import { logDataModification } from './utils/auditLog';

async function deleteMedication(id: string) {
  // Perform deletion
  await deleteMedicationFromStorage(id);

  // Log for audit
  await logDataModification('medication', 'deleted', id);
}
```

---

## Support

For security questions or concerns:
- Documentation: This file
- Technical Support: support@embermate.com
- Security Issues: security@embermate.com (private)

---

**Last Updated**: January 3, 2025
**Version**: 1.0.0
**Classification**: Internal - Security Documentation
