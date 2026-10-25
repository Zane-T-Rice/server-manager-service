import { ErrorMessages } from "../constants";
import { BadRequestError, InternalServerError } from "../errors";
import { formatMessage } from "./formatMessage";

type Auth0User = {
  user_id: string;
  email?: string;
};

type Auth0Client = {
  client_id: string;
  name: string;
};

// A machine-to-machine access token has a sub of <client_id>@clients.
const CLIENT_SUB_SUFFIX = "@clients";

let cachedToken: { value: string; expiresAt: number } | undefined;

// ISSUER is the Auth0 domain, e.g. https://tenant.auth0.com/
function getDomain() {
  return new URL(String(process.env.ISSUER)).origin;
}

/* Get (and cache) a Management API token using the client credentials grant. */
async function getManagementToken(): Promise<string> {
  // Refresh a minute early to avoid using a token as it expires.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`${getDomain()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: `${getDomain()}/api/v2/`,
    }),
  });
  if (!response.ok) throw new InternalServerError();

  const { access_token, expires_in } = await response.json();
  cachedToken = {
    value: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  };
  return access_token;
}

async function managementGet(path: string): Promise<Response> {
  const token = await getManagementToken();
  return fetch(`${getDomain()}/api/v2/${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

/* List Auth0 users one page at a time, ordered by email.
 * Auth0 only returns the first 1000 users when paging through all of them. */
async function listAuth0Users(
  page: number,
  perPage: number,
): Promise<Auth0User[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort: "email:1",
    include_fields: "true",
    fields: "user_id,email",
  });
  const response = await managementGet(`users?${params}`);
  if (!response.ok) throw new InternalServerError();
  return response.json();
}

/* Find Auth0 users whose email contains the given text.
 * One person can have several Auth0 users with the same email (i.e. logging in
 * with a password versus a federated identity), so callers should select a
 * specific user by user_id rather than by email. */
async function searchAuth0UsersByEmail(
  emailText: string,
): Promise<Auth0User[]> {
  // Escape lucene special characters so the text is searched literally.
  const escaped = emailText
    .trim()
    .toLowerCase()
    .replace(/[+\-&|!(){}[\]^"~*?:\\/\s]/g, "\\$&");
  const params = new URLSearchParams({
    q: `email:*${escaped}*`,
    search_engine: "v3",
    per_page: "10",
    include_fields: "true",
    fields: "user_id,email",
  });
  const response = await managementGet(`users?${params}`);
  if (!response.ok) throw new InternalServerError();
  return response.json();
}

/* Find the Auth0 user with the given Auth0 user id. */
async function getAuth0UserById(userId: string): Promise<Auth0User> {
  const response = await managementGet(`users/${encodeURIComponent(userId)}`);
  if (response.status === 404) {
    throw new BadRequestError(
      formatMessage(ErrorMessages.auth0UserNotFound, { identifier: userId }),
    );
  }
  if (!response.ok) throw new InternalServerError();
  return response.json();
}

/* Find machine-to-machine applications whose name contains the given text.
 * The Management API cannot filter clients by name, so filter here. */
async function searchAuth0ClientsByName(
  name: string,
  limit: number = 10,
): Promise<Auth0Client[]> {
  const params = new URLSearchParams({
    app_type: "non_interactive",
    per_page: "100",
    include_fields: "true",
    fields: "client_id,name",
  });
  const response = await managementGet(`clients?${params}`);
  if (!response.ok) throw new InternalServerError();

  const clients: Auth0Client[] = await response.json();
  const lowerName = name.trim().toLowerCase();
  return clients
    .filter((client) => client.name?.toLowerCase().includes(lowerName))
    .slice(0, limit);
}

/* Find the machine-to-machine application with the given client id. */
async function getAuth0ClientById(clientId: string): Promise<Auth0Client> {
  const response = await managementGet(
    `clients/${encodeURIComponent(clientId)}?fields=client_id,name&include_fields=true`,
  );
  if (response.status === 404) {
    throw new BadRequestError(
      formatMessage(ErrorMessages.auth0UserNotFound, { identifier: clientId }),
    );
  }
  if (!response.ok) throw new InternalServerError();
  return response.json();
}

export {
  CLIENT_SUB_SUFFIX,
  listAuth0Users,
  searchAuth0UsersByEmail,
  searchAuth0ClientsByName,
  getAuth0UserById,
  getAuth0ClientById,
};
