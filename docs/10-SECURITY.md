# Dhruto — Security Requirements

## 1. Authentication

- Password hashing with a strong password hashing algorithm.
- Access token with short lifetime.
- Refresh token rotation.
- Logout/revocation strategy.
- Account status enforcement.

## 2. Authorization

Use:

```text
Role
+
Permission
+
Resource ownership
+
Operational scope
```

Example:

A merchant may access only its own parcels and financial records.

A hub manager may access operational records within assigned hub scope.

## 3. API Security

- Global DTO validation.
- Reject unknown/unexpected input where appropriate.
- Rate limiting.
- Request size limits.
- Secure HTTP headers.
- Strict CORS policy.
- Parameterized queries/ORM protections.
- Avoid sensitive data in logs.

## 4. Idempotency

Mandatory for duplicate-sensitive operations.

The backend must detect:

```text
same key + same payload
```

and safely replay the original result.

It must reject:

```text
same key + different payload
```

## 5. Webhook Security

- Sign payloads.
- Include timestamp.
- Support replay protection.
- Store delivery attempts.
- Rotate secrets.

## 6. Public Tracking Security

Never expose:

- internal user IDs
- merchant financial data
- rider phone numbers unless explicitly intended
- internal hub metadata
- private notes
- administrative audit data

## 7. File Upload Security

For CSV/XLSX and proof uploads:

- validate extension
- validate MIME/content
- limit size
- sanitize filenames
- store outside executable paths
- scan where infrastructure supports it
- never trust client-provided metadata

## 8. Sensitive Data

Mask sensitive values in logs.

Never log:

- passwords
- refresh tokens
- full payment secrets
- provider credentials
- private API secrets

## 9. Audit

Security-sensitive events must be auditable:

- login
- logout
- failed login
- permission change
- financial mutation
- payout
- parcel override
- user suspension
- pricing changes

## 10. Dependency Security

- lock dependency versions
- run vulnerability scanning
- remove unused dependencies
- review package updates
- avoid unnecessary runtime packages

## 11. Secret Management

Never commit:

- database credentials
- JWT secrets
- provider credentials
- API keys
- webhook secrets

Use environment variables/secret management.

## 12. Security Testing

- authentication tests
- authorization tests
- ownership tests
- rate-limit tests
- input validation tests
- file upload tests
- webhook signature tests
- dependency scanning
