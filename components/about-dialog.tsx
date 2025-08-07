'use client';

import React from 'react';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-lg transition-all hover:scale-105 glass-card flex items-center justify-center"
          style={{
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)'
          }}
          aria-label="About WaveDigger"
        >
          <Info className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-4">About WaveDigger</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              What does this do?
            </h3>
            <p className="mb-2">
              WaveDigger helps you find the physical location of wireless networks:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Wi-Fi Access Points:</strong> Look up any router or access point using its BSSID (MAC address)</li>
              <li><strong>LTE Cell Towers:</strong> Find cell tower locations using network identifiers (MCC, MNC, TAC, Cell ID)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Key Features
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Single or batch BSSID searches</li>
              <li>Include surrounding access points option (find entire buildings/areas)</li>
              <li>LTE cell tower location lookup</li>
              <li>Location-based Access Point discovery</li>
              <li>Search history with China database indicators</li>
              <li>Shareable URLs for specific locations</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              How does it work?
            </h3>
            <p>
              This app queries Apple&apos;s location services database, which contains locations of 
              millions of Wi-Fi access points and cell towers worldwide. These locations are 
              crowdsourced from iOS devices that have location services enabled. If a network 
              isn&apos;t found in the global database, it automatically checks the Apple&apos;s China database.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Input Formats
            </h3>
            <div className="space-y-2">
              <div>
                <p className="font-medium">Wi-Fi BSSID formats:</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs mt-1 ml-2">
                  <li>AA:BB:CC:DD:EE:FF</li>
                  <li>AA-BB-CC-DD-EE-FF</li>
                  <li>AABBCCDDEEFF</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Cell Tower requires all 4 values:</p>
                <ul className="list-disc list-inside space-y-1 text-xs mt-1 ml-2">
                  <li>MCC: Mobile Country Code (e.g., 310 for USA)</li>
                  <li>MNC: Mobile Network Code (e.g., 410 for AT&T)</li>
                  <li>TAC: Tracking Area Code</li>
                  <li>Cell ID: Cell Tower Identifier</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Limitations
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Not all networks are in the database</li>
              <li>New or recently moved devices may not be found</li>
              <li>Only LTE towers supported (no 5G NR, UMTS, or GSM)</li>
              <li>Location accuracy varies (typically 50-100m for Wi-Fi, 100-500m for cell towers)</li>
              <li>Location search limited to ~5km tile resolution</li>
            </ul>
          </section>

          <section className="pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Credits
            </h3>
            <p>
              WaveDigger is built upon the research from the{' '}
              <a 
                href="https://github.com/acheong08/apple-corelocation-experiments"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
                style={{ color: 'var(--color-primary)' }}
              >
                apple-corelocation-experiments
              </a>{' '}
              project. Their work in reverse engineering Apple&apos;s location services API made 
              this tool possible.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}