import type { PluginHost } from '@syncbridge/plugin-api';

export interface FakeHost {
  host: PluginHost;
  statuses: PluginHost.StatusInfo[];
  environments: Record<string, string | string[]>[];
  actions: Map<string, PluginHost.Action>;
  asked: string[];
  forgotten: string[];
  /** The last status, which is what the card shows */
  last(): PluginHost.StatusInfo | undefined;
}

/**
 * The engine as the plugin sees it: what it tells and what it registers,
 * kept for the test to read. The answer the admins give is given here.
 */
export function fakeHost(answer: Partial<PluginHost.Answer> = {}): FakeHost {
  const statuses: PluginHost.StatusInfo[] = [];
  const environments: Record<string, string | string[]>[] = [];
  const actions = new Map<string, PluginHost.Action>();
  const asked: string[] = [];
  const forgotten: string[] = [];
  const host = {
    engine: { version: '2.0.0-test', apiVersion: '2.3.0' },
    logs: { registerTarget: () => undefined },
    events: { on: () => () => undefined },
    workers: {
      list: () => [],
      get: () => undefined,
      addEnvironment(environment: Record<string, string | string[]>) {
        environments.push(environment);
        return () => {
          const i = environments.indexOf(environment);
          if (i >= 0) environments.splice(i, 1);
        };
      },
    },
    status: {
      set: (status: PluginHost.StatusInfo) => statuses.push(status),
      clear: () => statuses.splice(0),
    },
    ui: {
      async ask(question: PluginHost.Question): Promise<PluginHost.Answer> {
        asked.push(question.id);
        return {
          choice: 'accept',
          by: 'tester',
          at: new Date().toISOString(),
          ...answer,
        };
      },
      forget: (id: string) => forgotten.push(id),
      registerAction(action: PluginHost.Action) {
        actions.set(action.name, action);
        return () => actions.delete(action.name);
      },
    },
  } as unknown as PluginHost;
  return {
    host,
    statuses,
    environments,
    actions,
    asked,
    forgotten,
    last: () => statuses.at(-1),
  };
}

/** Waits for what the plugin does of its own accord, off `activate` */
export async function waitFor(
  what: () => boolean,
  timeout = 5000,
): Promise<void> {
  const until = Date.now() + timeout;
  while (!what()) {
    if (Date.now() > until) throw new Error('Timed out waiting');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
