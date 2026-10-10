#!/usr/bin/env node
/*
  kit.js
*/

import { status } from './lib/status.js';
import { add } from './lib/add.js';
import { commit } from './lib/commit.js';
import { log } from './lib/log.js';
import { createTheme } from './lib/theme.js';

const USAGE = `kit — a git wrapper

  kit status [path…]      report the working tree, silent when clean and in sync.
                          a directory that is not a repository is looked into one level down.
  kit add [path…]         stage changes, then show what was staged.
  kit commit [words…]     stage, then commit using the words as the message.
  kit log [n] [-l]        one line per commit, -l the full message, n the count.
`;

const io = {
    log: (s) => process.stdout.write(s + '\n'),
    error: (s) => process.stderr.write(s + '\n'),
};

/*
  The one place the environment decides colour.

  Colour is only wanted when something is going to look at it, so a pipe or a
  redirected file gets plain text and a terminal gets the palette. Checking
  isTTY here rather than in theme.js keeps the decision at the edge: everything
  below receives a palette as an argument, and the test suite hands the renderers
  a plain one directly instead of asking the environment for it.
*/
const theme = createTheme(
    Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== 'dumb',
);

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd)
{
    case 'status':
        process.exit(status(rest, io, { theme }));
        break;
    case 'add':
        process.exit(add(rest, io, { theme }));
        break;
    case 'commit':
        process.exit(commit(rest, io, { theme }));
        break;
    case 'log':
        process.exit(log(rest, io, { theme }));
        break;
    case '--help':
    case '-h':
    case 'help':
    case undefined:
        process.stdout.write(USAGE);
        process.exit(cmd === undefined ? 1 : 0);
        break;
    default:
        io.error(`kit: unknown command '${cmd}'`);
        io.error('');
        process.stderr.write(USAGE);
        process.exit(1);
}
