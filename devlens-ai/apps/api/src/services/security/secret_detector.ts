export class SecretDetector {
  private static patterns = [
    { type: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
    { type: 'RSA Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/g },
    { type: 'GitHub Token', regex: /gh[p|o|u|s|r]_[A-Za-z0-9_]{36}/g },
    { type: 'Slack Token', regex: /xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/g },
    { type: 'Stripe API Key', regex: /sk_(live|test)_[0-9a-zA-Z]{24}/g },
  ];

  static scan(content: string, filePath: string) {
    const findings = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of this.patterns) {
        let match;
        while ((match = pattern.regex.exec(lines[i])) !== null) {
          const secret = match[0];
          // Mask the secret for storage
          const maskedEvidence = secret.substring(0, 3) + '...***...' + secret.substring(secret.length - 3);
          
          findings.push({
            type: pattern.type,
            filePath,
            line: i + 1,
            evidence: maskedEvidence
          });
        }
      }
    }
    
    return findings;
  }
}
