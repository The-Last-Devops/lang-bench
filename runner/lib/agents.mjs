// Phía runner: nói chuyện với các agent qua HTTP trên mạng nội bộ của compose.
//
// Danh sách agent đến từ biến môi trường LB_AGENTS, tức là từ docker-compose — không viết
// cứng trong code. Thêm một ngôn ngữ hay một phiên bản chỉ cần thêm một service và một mục
// trong biến đó; runner không phải sửa gì.
//
// The runner side: talks to the agents over HTTP on compose's own network.
//
// The agent list comes from LB_AGENTS, which means from docker-compose rather than from
// code. Adding a language or a version is a service plus an entry in that variable; the
// runner needs no change.
const TIMEOUT_MS = 15 * 60 * 1000;

/** "cpp=http://cpp:8100, node20=http://node20:8100" -> [{id, url}] */
export function parseAgents(spec = process.env.LB_AGENTS || '') {
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf('=');
      return i < 0 ? null : { id: pair.slice(0, i).trim(), url: pair.slice(i + 1).trim().replace(/\/$/, '') };
    })
    .filter(Boolean);
}

async function call(url, path, body, signal) {
  const res = await fetch(url + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${path} trả về ${res.status}`);
  return res.json();
}

/**
 * Chờ agent sẵn sàng. Container ngôn ngữ và container server khởi động song song, nên lượt
 * chạy đầu tiên có thể xảy ra trước khi agent kịp mở cổng — không chờ thì ngôn ngữ đó bị
 * báo "không có" một cách oan uổng.
 * Wait for an agent. The language containers and the server start in parallel, so a first
 * run can arrive before an agent has opened its port; without waiting, that language would
 * be reported unavailable for no good reason.
 */
export async function waitReady(agent, { tries = 40, gapMs = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      return await call(agent.url, '/info', undefined, AbortSignal.timeout(2000));
    } catch {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }
  return null;
}

export const buildOn = (agent, ids) => call(agent.url, '/build', { ids });

export const measureOn = (agent, req, signal) => call(agent.url, '/measure', req, signal);
