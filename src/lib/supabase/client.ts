/**
 * Supabase browser client stub.
 * Realtime is replaced with polling in useAuctionRealtime and useNotifications.
 * Channel calls are no-ops.
 */

const noop = () => stubClient
const noopChannel = {
  on: noop,
  subscribe: noop,
}

const stubClient = {
  channel: (_name: string) => noopChannel,
  removeChannel: (_ch: any) => {},
}

export const supabase = stubClient
