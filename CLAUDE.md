# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-file web-based code editor built with CodeMirror 6. The entire application is contained in `editor.html` - a self-contained HTML file with no build process or external dependencies beyond CDN imports.

## Architecture

### Single-File Structure
The application uses a monolithic architecture with everything in one HTML file:
- **HTML structure** (lines 463-540): Toolbar with dropdowns, sidebar, editor container, modals
- **CSS styling** (lines 36-459): All styles inline in `<style>` tag
- **JavaScript module** (lines 541-2700+): All application logic in a single `<script type="module">`

### Core Components

**1. IndexedDB Storage (lines 461-652)**
- Database name: `CodeEditorDB`
- Single object store: `files` with auto-incrementing `id`
- Indexes: `path` (unique), `parentId` (non-unique)
- Files store: `name`, `path`, `content`, `type` (file/folder), `parentId`, `cursorPosition`, timestamps
- CRUD operations handle hierarchical folder structures
- Transaction management: Always fetch data BEFORE starting write transactions to avoid `TransactionInactiveError`

**2. CodeMirror 6 Integration (lines 689-734)**
- Import map at top of file maps bare imports to esm.sh CDN URLs
- Extensions: `basicSetup`, `search`, `highlightSelectionMatches`, `oneDark` theme
- Language support: JavaScript, TypeScript, HTML, CSS, JSON, XML, Markdown, SQL
- Extension map (lines 667-681) determines language from file extension

**3. File Tree Sidebar (lines 923-1011)**
- Recursive rendering of folders and files
- Indentation classes: `indent-0`, `indent-1`, `indent-2`, `indent-3`
- Active file highlighted with `.active` class
- Inline action buttons (✏️ rename, 🗑️ delete) appear on hover
- File icons determined by extension via `getFileIcon()` function

**4. Cursor Position Persistence (lines 811-853)**
- Saves cursor position as character offset when switching files
- Restores position when reopening files
- Position stored in IndexedDB `cursorPosition` field
- Uses `view.dispatch()` with `scrollIntoView: true` for restoration

**5. Text Transformation Features**
Text transformation functions are organized into dropdown menus in the toolbar:

**Convert Case** dropdown (lines 473-482):
- `toPascalCase()`, `toCamelCase()`, `toSnakeCase()`: Case conversion utilities
- Operates on selected text or whole document if no selection
- Uses `transformText()` helper function (line 1173)

**Escape/Unescape** dropdown (lines 484-498):
- JavaScript/JSON escaping: Handles `"`, `\`, newlines, tabs
- URL encoding: `encodeURIComponent()` for partial, `encodeURI()` for full URLs
- HTML escaping: Converts `<`, `>`, `&`, `"`, `'` to entities
- Base64 encoding/decoding: See section below

**Minify/Format** dropdown (lines 500-505):
- JSON: `formatJSON()` (line 1404), `minifyJSON()` (line 1413)
- CSS: `formatCSS()` (line 1422), `minifyCSS()` (line 1440)
- HTML: `formatHTML()` (line 1451), `minifyHTML()` (line 1483)
- XML: `formatXML()` (line 1494), `minifyXML()` (line 1529)
- Detects file type automatically from active file extension

**6. Base64 and Binary File Handling**

**Encoding** (line 1280):
- `encodeBase64(str)`: Uses TextEncoder for proper UTF-8 handling
- Converts text to bytes, then to base64 with `btoa()`
- Works on selection or whole document

**Decoding** (line 1288):
- `decodeBase64Preview()`: Smart decode with MIME type detection
- Detects file type from magic numbers (PNG: `\x89PNG`, JPEG: `\xFF\xD8\xFF`, PDF: `%PDF`, etc.)
- Binary content (images/PDFs): Creates Blob URL → opens in new tab
- Text content: Decodes and replaces base64 in editor
- Handles both raw base64 and data URLs
- Uses Blob URLs instead of data URLs to avoid URL length limitations

**Binary File Import** (line 2502):
- `isBinaryFile(filename)`: Detects binary files by extension
- Binary files (images, PDFs, archives): Converted to base64 with `readAsDataURL()`
- Text files: Imported normally with `readAsText()`
- Stores raw base64 without data URL prefix
- Preserves original filename for both file types

**7. QR Code Generation and Reading**

**QR Code** dropdown (lines 514-520):
- Generate QR Code: Creates PNG QR code from text
- Read QR Code: Decodes QR code from base64 image

**Generation** (line 1420):
- `generateQRCode()`: Async function that generates QR codes from text
- Uses `qrcode` library imported from esm.sh
- Operates on selected text or whole document if no selection
- Generates 512x512px PNG with medium error correction
- Converts to Blob URL (avoiding data URL length issues)
- Opens QR code image in new browser tab
- Configuration: errorCorrectionLevel 'M', 2px margin

**Reading/Decoding** (line 1494):
- `readQRCode()`: Async function that decodes QR codes from images
- Uses `jsQR` library imported from esm.sh
- Accepts raw base64 or data URLs
- Detects MIME type from magic numbers (PNG, JPEG, GIF)
- Loads image, draws to canvas, extracts ImageData
- Uses jsQR to decode QR code from pixel data
- Replaces base64 in editor with decoded text
- Works on selection or whole document
- Shows clear error if no QR code detected

**Libraries Used**:
- `qrcode@1.5.3`: QR code generation, outputs data URLs
- `jsqr@1.4.0`: QR code reading from ImageData

**8. JWT/JWE Authentication and Encryption**

**JWT Dropdown** (lines 523-530):
- Sign JWT: Creates signed JSON Web Tokens
- Verify JWT: Verifies and decodes JWTs
- Settings: Configure algorithm, keys, and token claims

**JWE Dropdown** (lines 532-539):
- Encrypt JWE: Encrypts JSON payloads
- Decrypt JWE: Decrypts JWE tokens
- Settings: Same settings modal as JWT

**Settings Storage** (IndexedDB `jwtSettings` object store):
- `algorithm`: Selected signing/encryption algorithm (default: 'HS256')
- `secretKey`: Secret key for HS algorithms and JWE encryption
- `publicKeyJwk`: Public key in JWK format for RS/ES algorithms
- `privateKeyJwk`: Private key in JWK format for RS/ES algorithms
- `autoIat`: Auto-add issued-at timestamp (default: true)
- `autoExp`: Auto-add expiration time (default: false)
- `expDuration`: Expiration duration number (default: 1)
- `expUnit`: Expiration unit - seconds/minutes/hours/days/months/years (default: 'hours')

**JWT Operations**:

**Sign JWT** (line 1483):
- `signJWT()`: Async function that signs JSON payloads as JWTs
- Uses `jose` library (jose@5) imported from esm.sh
- Reads JSON from selection or whole document
- Signs with configured algorithm (HS256/384/512, RS256/384/512, ES256/384/512)
- Adds `iat` (issued at) if auto IAT enabled
- Adds `exp` (expires) if auto EXP enabled
- Replaces editor content with signed JWT string
- Error handling for missing keys, invalid JSON, signing failures

**Verify JWT** (line 1554):
- `verifyJWT()`: Async function that verifies and decodes JWTs
- Reads JWT string from selection or whole document
- Verifies signature using public key (RS/ES) or secret (HS)
- Decodes payload and replaces editor with formatted JSON
- Error handling for expired tokens, invalid signatures, wrong keys
- User choice: Returns payload only (no header)

**JWE Operations**:

**Encrypt JWE** (line 1611):
- `encryptJWE()`: Async function that encrypts JSON payloads
- Uses symmetric encryption with 32-character secret key
- Algorithm: Direct key agreement (`alg: 'dir'`) with AES-256 GCM (`enc: 'A256GCM'`)
- Reads JSON from selection or whole document
- Adds `iat` and `exp` claims if enabled
- Replaces editor content with encrypted JWE string
- Requires secret key of at least 32 characters

**Decrypt JWE** (line 1693):
- `decryptJWE()`: Async function that decrypts JWE tokens
- Uses same 32-character secret key as encryption
- Reads JWE string from selection or whole document
- Decrypts and replaces editor with formatted payload JSON
- Error handling for expired tokens, wrong keys, corrupted tokens

**Key Management Functions**:

**Generate Key Pair** (line 1388):
- `generateKeyPair()`: Generates RSA or EC key pairs for RS/ES algorithms
- Uses `jose.generateKeyPair()` with extractable option
- Exports keys to JWK format for IndexedDB storage
- Updates UI with generated public/private keys
- Only works for asymmetric algorithms (RS256/384/512, ES256/384/512)

**Get Keys** (lines 1423-1469):
- `getKeyForAlgorithm()`: Returns appropriate signing key (private for RS/ES, secret for HS)
- `getPublicKeyForAlgorithm()`: Returns verification key (public for RS/ES, secret for HS)
- Validates secret key length: HS256=32, HS384=48, HS512=64 bytes minimum
- Imports JWK keys using `jose.importJWK()`
- Throws errors if keys missing or invalid

**Settings Management** (lines 1260-1385):
- `initJWTSettings()`: Loads settings from IndexedDB on app startup
- `loadJWTSettings()`: Retrieves settings from IndexedDB
- `saveJWTSettings()`: Persists settings to IndexedDB
- `updateJWTSettingsUI()`: Syncs UI with current settings
- `calculateExpiration()`: Converts duration+unit to Unix timestamp
- `getExpirationString()`: Converts duration+unit to jose format (e.g., "2h", "30d")

**Settings Modal** (lines 561-636):
- Algorithm dropdown: All 9 supported algorithms
- Secret key input: For HS algorithms (shows min length requirement)
- Key pair section: For RS/ES algorithms with generate button
- Public/private key displays: Read-only textareas with copy buttons
- Auto IAT checkbox: Automatically set issued-at timestamp
- Auto EXP checkbox: Automatically set expiration time
- Expiration config: Duration number + unit dropdown (seconds to years)
- Save/Cancel buttons: Persist or discard changes

**Supported Algorithms**:
- **HS256, HS384, HS512**: HMAC + SHA2 (symmetric, requires secret key)
- **RS256, RS384, RS512**: RSA + SHA2 (asymmetric, requires key pair)
- **ES256, ES384, ES512**: ECDSA + SHA2 (asymmetric, requires key pair)

**Libraries Used**:
- `jose@5`: JWT/JWE operations, key generation, crypto operations

## Key Functions

### File Operations
- `openFile(id)`: Saves current cursor position, loads file, restores cursor position, focuses editor
- `saveCurrentFile()`: Creates "Untitled" file if none active, shows rename modal for Untitled files
- `createNewFile()`: Auto-generates "Untitled (N)" names
- `deleteItem(id)`: Recursively deletes folders and children
- `renameItem(id, newName)`: Updates paths for item and all children if folder

### Text Transformation Operations
- `transformText(transformFn, transformName)`: Generic text transformation function (line 1173)
  - Operates on selection if text is selected, otherwise whole document
  - Applies transformation function and updates editor with `view.dispatch()`
  - Shows status message with transformation name
  - Used by all case conversion, escape/unescape, and base64 encode operations

### UI Patterns
- **Inline delete confirmation**: Delete button (🗑️) transforms into ✓/✕ buttons instead of modal
- **Modal for rename**: Reusable modal at lines 431-446
- **Auto-focus**: Editor gains focus when file opens
- **Filename truncation**: CSS ellipsis prevents long names from pushing action buttons off-screen
- **Dropdown menus**: Toolbar buttons with dropdown content for grouped operations
- **Context menu**: Right-click on editor provides quick access to text transformations

### Important Behaviors
- **Untitled file naming**: `getNextUntitledName()` finds highest number and increments
- **Language detection**: Automatic from file extension when opening files
- **Save with Cmd+S**: Creates Untitled file if no file active, prompts for name if Untitled
- **Binary file detection**: Extension-based detection for automatic base64 conversion on import
- **Smart decode**: Base64 decode behavior depends on content type (preview for images/PDFs, replace for text)

## Keyboard Shortcuts
- `Cmd/Ctrl + S`: Save current file
- `Cmd/Ctrl + N`: Create new file
- `Cmd/Ctrl + F`: Open search (CodeMirror default)
- `Enter`: Confirm in modals
- `Escape`: Cancel in modals

## File Icon Mapping (lines 789-809)
- JavaScript (.js, .jsx): 🟨
- TypeScript (.ts, .tsx): 🔷
- HTML (.html, .htm): 🌐
- CSS (.css): 🎨
- JSON (.json): 📋
- XML (.xml): 📑
- Markdown (.md, .markdown): 📝
- SQL (.sql): 🗄️
- Text (.txt): 📄
- Folders: 📁
- Default/Unknown: 📄

## Common Modifications

### Adding New Text Transformation
1. Create transformation function (follow pattern of existing functions like `encodeBase64()`)
2. Add button to appropriate dropdown menu in HTML (lines 473-505)
3. Add event listener using either:
   - `transformText(yourFunction, 'Display Name')` for simple transformations
   - Custom function like `decodeBase64Preview()` for complex logic
4. Optionally add to context menu (search for "Context menu options")

### Adding New Language Support
1. Add import in `<script type="importmap">` (lines 8-35)
2. Import language in module (search for "@codemirror/lang-")
3. Add to `languageMap` (search for "const languageMap")
4. Add extension mappings to `extensionMap` (search for "const extensionMap")
5. Add icon to `getFileIcon()` function (search for "function getFileIcon")

### Adding Binary File Type Support
1. Add file extension to `binaryExtensions` array in `isBinaryFile()` function (line 2504)
2. Optionally add magic number detection in `decodeBase64Preview()` (lines 1330-1342)
3. Files with added extension will automatically convert to base64 on import

### Customizing QR Code Generation
To modify QR code parameters, edit the `generateQRCode()` function (line 1447):
- `errorCorrectionLevel`: 'L', 'M', 'Q', or 'H' (Low to High)
- `width`: Size in pixels (default 512)
- `margin`: White border size (default 2)
- `type`: 'image/png', 'image/jpeg', or 'image/webp'
- Additional options: `color.dark`, `color.light` for custom colors

### Customizing JWT/JWE Behavior

**Adding Additional JWT Claims**:
Modify `signJWT()` function (line 1483) to add custom claims:
```javascript
let jwtBuilder = new jose.SignJWT({
    ...payload,  // Original payload
    customClaim: 'value',  // Add custom claim
    iss: 'your-issuer',  // Add issuer
    aud: 'your-audience'  // Add audience
})
```

**Changing Default Algorithm**:
Modify initial settings in `jwtSettings` object (line 1261):
```javascript
let jwtSettings = {
    algorithm: 'RS256',  // Change from 'HS256' to desired default
    // ... rest of settings
};
```

**Adding Algorithm Validation**:
Modify `verifyJWT()` function (line 1554) to restrict allowed algorithms:
```javascript
const { payload, protectedHeader } = await jose.jwtVerify(text, key, {
    algorithms: ['HS256', 'RS256'],  // Only allow these algorithms
});
```

**Customizing JWE Encryption Algorithm**:
Modify `encryptJWE()` function (line 1611) to change encryption method:
```javascript
.setProtectedHeader({
    alg: 'A256KW',      // Use AES Key Wrap instead of direct
    enc: 'A256CBC-HS512'  // Use different content encryption
})
```

**Adding Issuer/Audience Validation**:
Add validation to `verifyJWT()` after line 1586:
```javascript
const { payload, protectedHeader } = await jose.jwtVerify(text, key, {
    issuer: 'expected-issuer',
    audience: 'expected-audience'
});
```

### Modifying Delete Behavior
Delete uses inline confirmation (search for "showInlineConfirm"). The function:
- Hides delete button
- Shows ✓ (confirm) and ✕ (cancel) buttons
- Restores delete button on cancel or click outside
- Calls `handleDelete()` on confirm

### Transaction Management Pattern
Always follow this pattern to avoid inactive transaction errors:
```javascript
// 1. Fetch data FIRST (creates and closes its own transaction)
const item = await getItem(id);

// 2. Process/prepare data
const updated = { ...item, ...updates };

// 3. Start NEW transaction for write
const transaction = db.transaction(['files'], 'readwrite');
const store = transaction.objectStore('files');

// 4. Perform write operation
return new Promise((resolve, reject) => {
    const request = store.put(updated);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
```

## Important Technical Considerations

### Blob URL Management
- When creating Blob URLs with `URL.createObjectURL()`, the URL remains valid for the browser session
- Consider calling `URL.revokeObjectURL()` if implementing cleanup (not currently done)
- Blob URLs avoid the URL length limitations of data URLs (which can cause blank pages)

### Base64 Data Handling
- Always use raw base64 strings in storage (no data URL prefix)
- Reconstruct data URLs only when needed for display/preview
- Binary files stored as base64 can be large - IndexedDB handles this well
- Magic number detection is more reliable than file extensions for MIME types

### Text Encoding
- Use `TextEncoder`/`TextDecoder` for proper UTF-8 handling with base64
- `btoa()`/`atob()` work with binary strings, not Unicode directly
- Pattern: text → TextEncoder → bytes → binary string → btoa → base64

### CodeMirror State Updates
- Always use `view.dispatch()` to update editor content
- Track selection ranges (`from`, `to`) for partial replacements
- Use `scrollIntoView: true` when restoring cursor position
- Never modify `view.state` directly - it's immutable

### JWT/JWE Security Considerations

**Key Management**:
- HS algorithms use symmetric keys - same key for sign and verify
- RS/ES algorithms use asymmetric keys - private key signs, public key verifies
- Keys stored in IndexedDB in JWK format for easy import/export
- Never expose private keys to untrusted parties
- Minimum key lengths enforced: HS256=32, HS384=48, HS512=64 bytes

**Cryptographic Operations**:
- All crypto operations use Web Crypto API via jose library
- HTTPS required for Web Crypto API (or localhost for development)
- Keys generated with `extractable: true` to allow export to IndexedDB
- JWK format used for key storage (JSON Web Key standard)

**Token Validation**:
- Always verify JWTs before trusting payload data
- Check expiration (`exp`) claim automatically during verification
- Expired tokens rejected with clear error message
- Invalid signatures detected and reported
- Wrong keys cause verification failure

**JWE Encryption**:
- Uses symmetric encryption (AES-256 GCM) for content
- Requires 32+ character secret key
- Algorithm `alg: 'dir'` means key used directly as content encryption key
- Same key used for both encryption and decryption
- Corrupted or tampered tokens fail to decrypt

**Best Practices**:
- Use Auto IAT to timestamp all tokens
- Use Auto EXP to prevent unlimited token validity
- For production: Use RS256/ES256 for better key distribution
- For symmetric: Use cryptographically random secret keys, not passwords
- Rotate keys periodically in production environments

## Testing
No automated tests. Test manually by opening `editor.html` in a browser.

## Deployment
Simply serve `editor.html` - no build process required. All dependencies loaded from CDN.
