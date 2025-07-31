'use client';

import React from 'react';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-lg transition-all hover:scale-105 glass-card"
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
            <p>
              WaveDigger finds the physical location of Wi-Fi access points using their BSSID 
              (MAC address). Enter any BSSID and if it's in the database, you'll see its 
              approximate location on the map.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              How does it work?
            </h3>
            <p>
              This app queries Apple's location services database, which contains locations of 
              millions of Wi-Fi access points worldwide. These locations are crowdsourced from 
              iOS devices that have location services enabled.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Limitations
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Not all Wi-Fi access points are in the database</li>
              <li>New or recently moved devices may not be found</li>
              <li>Private or enterprise networks might be excluded</li>
              <li>Location accuracy varies (typically within 50-100 meters)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              BSSID Formats
            </h3>
            <p>
              You can enter BSSIDs in any of these formats:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-xs mt-2">
              <li>AA:BB:CC:DD:EE:FF</li>
              <li>AA-BB-CC-DD-EE-FF</li>
              <li>AABBCCDDEEFF</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Coming Soon
            </h3>
            <p>
              Cell tower location tracking support is planned for a future update.
            </p>
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
                style={{ color: 'var(--color-primary-500)' }}
              >
                apple-corelocation-experiments
              </a>{' '}
              project. Their work in reverse engineering Apple's location services API made 
              this tool possible.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}