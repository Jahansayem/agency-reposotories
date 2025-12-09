'use client';

import { useState } from 'react';

export default function OutlookSetupPage() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const manifestUrl = 'https://shared-todo-list-production.up.railway.app/outlook/manifest.xml';

  const copyManifestUrl = () => {
    navigator.clipboard.writeText(manifestUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const downloadManifest = async () => {
    setDownloading(true);
    try {
      const response = await fetch(manifestUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bealer-todo-manifest.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(manifestUrl, '_blank');
    }
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#0033A0] transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Todo List
          </a>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0033A0] rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              B
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Outlook Add-in Setup</h1>
              <p className="text-slate-600">Convert emails to tasks with AI</p>
            </div>
          </div>
        </div>

        {/* What it does */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">✨</span> What does it do?
          </h2>
          <p className="text-slate-600 mb-4">
            The Bealer Todo Outlook Add-in lets you convert any email into a task with one click.
            Our AI automatically extracts:
          </p>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Task description</strong> - Clear, actionable task from the email content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Assignee</strong> - Detects who should handle the task (Sefra, Derrick, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Priority</strong> - Identifies urgent vs. low priority requests</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Due date</strong> - Parses deadlines like "by Friday" or "end of week"</span>
            </li>
          </ul>
        </div>

        {/* Step 1: Download Manifest */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Download the Manifest File
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            First, download the add-in manifest file to your computer. You&apos;ll upload this file to Outlook in the next step.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadManifest}
              disabled={downloading}
              className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-medium hover:bg-[#002580] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Manifest File
                </>
              )}
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-slate-500 mb-2">Or copy the URL to download manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={manifestUrl}
                className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-mono text-slate-600"
              />
              <button
                onClick={copyManifestUrl}
                className="px-3 py-2 bg-white border border-blue-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                {copiedUrl ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Installation Instructions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Install the Add-in
          </h2>

          {/* Quick Method - All Platforms */}
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-green-600">⚡</span>
              Quick Method (All Platforms)
            </h3>
            <p className="text-slate-600 text-sm mb-3">
              This works for Outlook on the web, Windows (new & classic), and Mac:
            </p>
            <ol className="space-y-3 text-slate-600 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
                <div>
                  <p>Go to <a href="https://aka.ms/olksideload" target="_blank" rel="noopener noreferrer" className="text-[#0033A0] font-medium hover:underline">aka.ms/olksideload</a> in your browser</p>
                  <p className="text-xs text-slate-500 mt-1">This opens Outlook and the Add-ins dialog automatically</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
                <div>
                  <p>Click <strong>"My add-ins"</strong> in the dialog</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
                <div>
                  <p>Scroll to <strong>"Custom Addins"</strong> section at the bottom</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">4</span>
                <div>
                  <p>Click <strong>"Add a custom add-in"</strong> → <strong>"Add from File..."</strong></p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">5</span>
                <div>
                  <p>Select the <strong>bealer-todo-manifest.xml</strong> file you downloaded</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">6</span>
                <div>
                  <p>Click <strong>"Install"</strong> when prompted</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Alternative: Classic Outlook on Windows */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 12V6.75L9 5.43V11.91L3 12M20 3V11.75L10 11.9V5.21L20 3M3 13L9 13.09V19.9L3 18.75V13M20 13.25V22L10 20.09V13.1L20 13.25Z"/>
                </svg>
              </span>
              Alternative: Classic Outlook on Windows
            </h3>
            <ol className="space-y-2 text-slate-600 text-sm ml-9">
              <li>1. Open Outlook and go to <strong>File</strong> → <strong>Info</strong> → <strong>Manage Add-ins</strong></li>
              <li>2. This opens the Add-ins dialog in your browser</li>
              <li>3. Follow steps 2-6 from the Quick Method above</li>
            </ol>
          </div>

          {/* Alternative: Outlook for Mac */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
              </span>
              Alternative: Outlook for Mac
            </h3>
            <ol className="space-y-2 text-slate-600 text-sm ml-9">
              <li>1. In Outlook, click <strong>Get Add-ins</strong> in the ribbon (or <strong>...</strong> → <strong>Get Add-ins</strong>)</li>
              <li>2. Click <strong>"My add-ins"</strong></li>
              <li>3. Scroll to <strong>"Custom Addins"</strong> and click <strong>"Add a custom add-in"</strong> → <strong>"Add from File..."</strong></li>
              <li>4. Select the downloaded manifest file and click <strong>Install</strong></li>
            </ol>
          </div>

          {/* Note about sync */}
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            <strong>Note:</strong> After installing, the add-in syncs across all your Outlook clients (web, Windows, Mac).
            On classic Outlook for Windows, it may take up to 24 hours for the add-in to appear due to caching.
          </div>
        </div>

        {/* Step 3: How to Use */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            How to Use
          </h2>
          <ol className="space-y-4 text-slate-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#D4A853] text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p><strong>Open any email</strong> in Outlook that you want to convert to a task</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#D4A853] text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p>Look for the <strong>"Bealer Todo"</strong> button in the ribbon or message toolbar</p>
                <p className="text-sm text-slate-500 mt-1">On Outlook web, it may appear under the <strong>...</strong> (More actions) menu</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#D4A853] text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p>Click <strong>"Analyze Email with AI"</strong> - the AI will read the email and suggest task details</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#D4A853] text-white rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p><strong>Review and edit</strong> the suggested task, assignee, priority, and due date</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#D4A853] text-white rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div>
                <p>Click <strong>"Add Task"</strong> - the task will appear in your todo list instantly!</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> Troubleshooting
          </h2>
          <div className="space-y-4 text-slate-600">
            <div>
              <p className="font-medium text-slate-700">Can&apos;t find &quot;Add a custom add-in&quot;?</p>
              <p className="text-sm">Your organization may have disabled custom add-ins. Contact your IT administrator and ask them to enable the <strong>&quot;Custom add-ins&quot;</strong> option in the Microsoft 365 Admin Center under <strong>Settings → Integrated Apps</strong>.</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Add-in not appearing after installation?</p>
              <p className="text-sm">Try refreshing Outlook or signing out and back in. On classic Outlook for Windows, it can take up to 24 hours due to caching. The add-in button only appears when you have an email open (not in the inbox list view).</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">Getting a permission error?</p>
              <p className="text-sm">You need the &quot;My Custom Apps&quot; role in your Exchange settings. Contact your Exchange administrator to grant the necessary permissions.</p>
            </div>
            <div>
              <p className="font-medium text-slate-700">How do I remove the add-in?</p>
              <p className="text-sm">Go to <a href="https://aka.ms/olksideload" target="_blank" rel="noopener noreferrer" className="text-[#0033A0] hover:underline">aka.ms/olksideload</a>, find Bealer Todo under &quot;Custom Addins&quot;, click the <strong>...</strong> menu, and select <strong>Remove</strong>.</p>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="bg-slate-100 rounded-xl p-4 text-center text-sm text-slate-600">
          <p>
            For more details, see the{' '}
            <a
              href="https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0033A0] hover:underline"
            >
              official Microsoft documentation
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>Need help? Contact your administrator or the Bealer Agency team.</p>
        </div>
      </div>
    </div>
  );
}
