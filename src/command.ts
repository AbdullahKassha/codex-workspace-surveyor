import { interpret } from './interpret.js';
import { render } from './render.js';
import { scenarios } from './scenarios.js';

const help = `Workspace Surveyor for Codex — bundled synthetic demonstrations only.
Usage:
  npm run cli -- demo [scenario]
  npm run cli -- demo --list
  npm run cli -- --help

Scenarios: overview (default), disagreement, coverage
No files, stdin, configuration, or real Codex state are read.
No global executable is installed. Run npm run build before using the CLI.
`;

type CommandResult = Readonly<{ stdout: string; stderr: string; exitCode: 0 | 1 | 2 }>;

export function run(args: readonly string[]): CommandResult {
  try {
    if (args.length === 0 || (args.length === 1 && args[0] === '--help') ||
      (args.length === 2 && args[0] === 'demo' && args[1] === '--help')) {
      return { stdout: help, stderr: '', exitCode: 0 };
    }
    if (args.length === 2 && args[0] === 'demo' && args[1] === '--list') {
      return { stdout: `${scenarios.map(s => s.name).join('\n')}\n`, stderr: '', exitCode: 0 };
    }
    if (args[0] === 'demo' && args.length <= 2) {
      const scenario = scenarios.find(s => s.name === (args[1] ?? 'overview'));
      if (scenario) return { stdout: render(interpret(scenario)), stderr: '', exitCode: 0 };
    }
    // Do not echo arbitrary arguments: they may contain private values or controls.
    return { stdout: '', stderr: `Invalid command or scenario. Choose a bundled scenario.\n\n${help}`, exitCode: 2 };
  } catch {
    // Do not disclose stack traces, local paths, or arbitrary exception messages.
    return { stdout: '', stderr: 'Internal error while explaining a bundled synthetic scenario.\n', exitCode: 1 };
  }
}
