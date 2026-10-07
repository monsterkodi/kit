#!/usr/bin/env node
/*
  kit.mjs

    kit status [path…]       report the working tree; silent when clean
    kit add [path…]          stage changes, then show what was staged
    kit commit [words…]      stage, then commit with the words as the message
    kit log [n]              one line per commit, optionally the n most recent

  Unknown subcommands are an error by design: kit deliberately does not fall
  through to raw git. Anything kit does not cover is better served by git.
*/

import { status } from './lib/status.mjs';
import { add } from './lib/add.mjs';
import { commit } from './lib/commit.mjs';
import { log } from './lib/log.mjs';

const USAGE = `kit — a git wrapper

  kit status [path…]      report the working tree; silent when clean
  kit add [path…]         stage changes, then show what was staged
  kit commit [words…]     stage, then commit using the words as the message
  kit log [n]             one line per commit, optionally the n most recent
`;

const io = {
    log: (s) => process.stdout.write(s + '\n'),
    error: (s) => process.stderr.write(s + '\n'),
};

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd)
{
    case 'status':
        process.exit(status(rest, io));
        break;
    case 'add':
        process.exit(add(rest, io));
        break;
    case 'commit':
        process.exit(commit(rest, io));
        break;
    case 'log':
        process.exit(log(rest, io));
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
