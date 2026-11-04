/**
 * Zaboraa Network Path Analyzer - Shared Firewall Request & Export Utilities
 * 
 * Enforces strict CSV sanitization (prevents spreadsheet formula injection),
 * protocol+port+destination deduplication, and template CLI generation.
 */

import { FirewallRequestRule } from '../engine/types';

/**
 * Sanitizes a string for CSV cell insertion:
 * 1. Prefixes cells starting with '=', '+', '-', '@', '\t', '\r' with an apostrophe to neutralize spreadsheet formula injection.
 * 2. Escapes double quotes.
 * 3. Encloses in quotes.
 */
export function sanitizeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Formula injection prevention (OWASP CSV Injection guide)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Deduplicates firewall request rules using PROTOCOL + PORT + DESTINATION.
 * Ensures TCP 5201 and UDP 5201 are both preserved.
 */
export function deduplicateFirewallRules(rules: FirewallRequestRule[]): FirewallRequestRule[] {
  const seen = new Set<string>();
  const deduplicated: FirewallRequestRule[] = [];

  for (const rule of rules) {
    const key = `${rule.protocol.toUpperCase().trim()}::${rule.port.trim()}::${rule.destination.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(rule);
    }
  }

  return deduplicated;
}

/**
 * Formats firewall rules as plain text table for change tickets.
 */
export function generateFirewallTextTable(
  rules: FirewallRequestRule[],
  sourceAddress: string,
  targetHost: string
): string {
  const effectiveSource = sourceAddress?.trim() || '<SOURCE_SUBNET_NOT_SET>';
  const border = '-----------------------------------------------------------------------------------------------------------------------';

  const lines = [
    '# ZABORAA NETWORK PATH ANALYZER - FIREWALL CHANGE REQUEST',
    `# Target Endpoint : ${targetHost}`,
    `# Source Allowed  : ${effectiveSource}`,
    `# Generated At    : ${new Date().toISOString()}`,
    '# Note            : Review all port allocations against your organization security architecture baseline.',
    border,
    'SOURCE                        | DESTINATION                   | PROTO | PORT     | DIRECTION                 | STATUS       | PURPOSE',
    border
  ];

  for (const r of rules) {
    const src = (sourceAddress || r.source || '<SOURCE_SUBNET_NOT_SET>').substring(0, 29).padEnd(29);
    const dst = r.destination.substring(0, 29).padEnd(29);
    const proto = r.protocol.substring(0, 5).padEnd(5);
    const port = r.port.substring(0, 8).padEnd(8);
    const dir = r.direction.substring(0, 25).padEnd(25);
    const stat = r.status.toUpperCase().substring(0, 12).padEnd(12);
    lines.push(`${src} | ${dst} | ${proto} | ${port} | ${dir} | ${stat} | ${r.purpose}`);
  }

  lines.push(border);
  return lines.join('\n');
}

/**
 * Formats firewall rules as CSV with injection protection.
 */
export function generateFirewallCsv(rules: FirewallRequestRule[], sourceAddress: string): string {
  const headers = ['Source', 'Destination', 'Protocol', 'Port', 'Direction', 'Status', 'SuggestedAction', 'Purpose'];
  const rows: string[] = [headers.map(sanitizeCsvCell).join(',')];

  for (const r of rules) {
    const src = sourceAddress || r.source || 'Source not set';
    rows.push([
      sanitizeCsvCell(src),
      sanitizeCsvCell(r.destination),
      sanitizeCsvCell(r.protocol),
      sanitizeCsvCell(r.port),
      sanitizeCsvCell(r.direction),
      sanitizeCsvCell(r.status),
      sanitizeCsvCell(r.suggestedAction),
      sanitizeCsvCell(r.purpose)
    ].join(','));
  }

  return rows.join('\r\n');
}

/**
 * Generates sample CLI templates (Azure NSG, Cisco ASA) from the exact same table rows.
 */
export function generateFirewallCliSnippets(
  rules: FirewallRequestRule[],
  sourceAddress: string
): string {
  const effectiveSource = sourceAddress?.trim() || '<SOURCE_SUBNET>';
  const lines: string[] = [
    '# =====================================================================',
    '# TEMPLATE, REVIEW BEFORE USE - Security policy CLI generation',
    '# Verify priority numbers, interface names, and policy context.',
    '# =====================================================================\n'
  ];

  lines.push('# --- Microsoft Azure Network Security Group (NSG) CLI ---');
  let priority = 1010;
  for (const r of rules) {
    const ruleName = `Allow-${r.protocol}-${r.port.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const proto = r.protocol.toLowerCase() === 'udp' ? 'Udp' : r.protocol.toLowerCase() === 'tcp' ? 'Tcp' : '*';
    lines.push(
      `az network nsg rule create --resource-group <RESOURCE_GROUP> --nsg-name <NSG_NAME> \\\n` +
      `  --name "${ruleName}" --priority ${priority} --direction Inbound --access Allow \\\n` +
      `  --source-address-prefixes "${effectiveSource}" --destination-port-ranges "${r.port}" \\\n` +
      `  --protocol ${proto} --description "${r.purpose.replace(/"/g, '')}"`
    );
    priority += 10;
  }

  lines.push('\n# --- Cisco ASA / Secure Firewall Access-List (ACL) ---');
  for (const r of rules) {
    const proto = r.protocol.toLowerCase();
    if (proto === 'tcp' || proto === 'udp') {
      lines.push(
        `access-list <ACL_NAME> extended permit ${proto} ${effectiveSource} host ${r.destination} eq ${r.port}`
      );
    } else {
      lines.push(
        `access-list <ACL_NAME> extended permit ip ${effectiveSource} host ${r.destination}`
      );
    }
  }

  return lines.join('\n');
}
