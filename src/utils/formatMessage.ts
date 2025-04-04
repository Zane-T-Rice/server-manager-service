// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatMessage(s: string, parameters: Record<string, any>) {
  return s.replace(/\{(\w+)\}/g, (match, key) => {
    return parameters[key] || match;
  });
}

export { formatMessage };
