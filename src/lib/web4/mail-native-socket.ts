import { Duplex } from 'node:stream';
import type { Socket } from 'node:net';
import type { ReadableStream, WritableStream } from 'node:stream/web';

export type NativeTlsSocket = {
  opened: Promise<unknown>; closed: Promise<void>; close(): Promise<void>;
  readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array>;
};
export type NativeTlsConnect = (address: { hostname: string; port: number }, options: { secureTransport: 'on' }) => NativeTlsSocket;
export const nativeSmtpConnector = Symbol.for('vector.smtp.native-tls-connect');

// Cloudflare validates the server certificate/hostname before opened resolves.
// No plaintext, IP substitution, custom CA or verification override is exposed.
export async function openNativeSmtpSocket(connect: NativeTlsConnect, hostname: string, port: number, onDataCommand?: () => void): Promise<Socket> {
  if (port !== 465) throw Object.assign(new Error('SMTP_NATIVE_TLS_PORT_REQUIRED'), { code: 'ETLS', command: 'CONN' });
  const socket = connect({ hostname, port }, { secureTransport: 'on' });
  socket.closed.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([socket.opened, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('SMTP_NATIVE_CONNECT_TIMEOUT'), { code: 'ETIMEDOUT', command: 'CONN' })), 8000);
    })]);
    const stream = Duplex.fromWeb({ readable: socket.readable, writable: socket.writable });
    let idle: ReturnType<typeof setTimeout> | undefined;
    let duration = 0;
    const refresh = () => { if (idle) clearTimeout(idle); if (duration) idle = setTimeout(() => stream.emit('timeout'), duration); };
    // Nodemailer uses the net.Socket timeout surface on its custom Duplex.
    Object.assign(stream, {
      setTimeout(milliseconds: number) { duration = milliseconds; refresh(); return stream; },
    });
    // Do not attach a data listener: it would consume the SMTP greeting before
    // Nodemailer installs its parser. read/write activity refreshes the timer.
    const read = stream._read.bind(stream), write = stream._write.bind(stream);
    stream._read = size => { refresh(); read(size); };
    stream._write = (chunk, encoding, callback) => {
      if (Buffer.from(chunk).toString('ascii') === 'DATA\r\n') onDataCommand?.();
      refresh(); write(chunk, encoding, callback);
    };
    stream.once('close', () => { if (idle) clearTimeout(idle); void socket.close().catch(() => {}); });
    return stream as Socket;
  } catch (error) { void socket.close().catch(() => {}); throw error; }
  finally { if (timer) clearTimeout(timer); }
}
