import {
  getAuth0ClientById,
  listAuth0Users,
  searchAuth0ClientsByName,
  searchAuth0UsersByEmail,
  getAuth0UserById,
} from "../../src/utils/auth0ManagementClient";

describe("auth0ManagementClient", () => {
  const fetchMock = jest.fn();
  const tokenResponse = {
    ok: true,
    json: async () => ({ access_token: "token", expires_in: 3600 }),
  };

  beforeAll(() => {
    process.env.ISSUER = "https://tenant.auth0.com/";
    process.env.AUTH0_MGMT_CLIENT_ID = "id";
    process.env.AUTH0_MGMT_CLIENT_SECRET = "secret";
    global.fetch = fetchMock;
  });
  beforeEach(() => fetchMock.mockReset());

  it("should search users by email text, requesting a (cached) token first", async () => {
    const users = [
      { user_id: "google-oauth2|1", email: "a@b.com" },
      { user_id: "auth0|2", email: "a@b.com" },
    ];
    fetchMock.mockResolvedValueOnce(tokenResponse).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => users,
    });

    await expect(searchAuth0UsersByEmail(" A@b ")).resolves.toEqual(users);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://tenant.auth0.com/oauth/token",
      expect.objectContaining({ method: "POST" }),
    );
    const [url, options] = fetchMock.mock.calls[1];
    expect(options).toEqual({ headers: { authorization: "Bearer token" } });
    const params = new URL(url).searchParams;
    expect(new URL(url).pathname).toBe("/api/v2/users");
    expect(params.get("q")).toBe("email:*a@b*");
    expect(params.get("search_engine")).toBe("v3");

    // The second search reuses the cached token.
    await searchAuth0UsersByEmail("a@b");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should escape lucene special characters in the search", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await searchAuth0UsersByEmail("a+b*:c");
    const params = new URL(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get("q")).toBe("email:*a\\+b\\*\\:c*");
  });

  it("should surface a failure to get a token", async () => {
    // Move past the expiry of any cached token so a new one is requested.
    const now = jest
      .spyOn(Date, "now")
      .mockReturnValue(Date.now() + 86_400_000);
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchAuth0UsersByEmail("a")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now.mockRestore();
  });

  it("should surface search failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchAuth0UsersByEmail("a")).rejects.toThrow();
  });

  it("should find a user by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user_id: "auth0|1", email: "a@b.com" }),
    });
    await expect(getAuth0UserById("auth0|1")).resolves.toEqual({
      user_id: "auth0|1",
      email: "a@b.com",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tenant.auth0.com/api/v2/users/auth0%7C1",
      expect.anything(),
    );
  });

  it("should reject an unknown user id and surface other failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(getAuth0UserById("auth0|nope")).rejects.toThrow(
      "No Auth0 user was found",
    );
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(getAuth0UserById("auth0|1")).rejects.toThrow();
  });

  it("should search machine-to-machine applications by name", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { client_id: "1", name: "Deploy Bot" },
        { client_id: "2", name: "Other" },
        { client_id: "3" },
      ],
    });
    await expect(searchAuth0ClientsByName(" bot ")).resolves.toEqual([
      { client_id: "1", name: "Deploy Bot" },
    ]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v2/clients");
    expect(url.searchParams.get("app_type")).toBe("non_interactive");
  });

  it("should find a machine-to-machine application by client id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ client_id: "1", name: "Deploy Bot" }),
    });
    await expect(getAuth0ClientById("1")).resolves.toEqual({
      client_id: "1",
      name: "Deploy Bot",
    });
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(getAuth0ClientById("nope")).rejects.toThrow(
      "No Auth0 user was found",
    );
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(getAuth0ClientById("1")).rejects.toThrow();
  });

  it("should list users a page at a time, ordered by email", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ user_id: "1" }],
    });
    await expect(listAuth0Users(2, 50)).resolves.toEqual([{ user_id: "1" }]);
    const params = new URL(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get("page")).toBe("2");
    expect(params.get("per_page")).toBe("50");
    expect(params.get("sort")).toBe("email:1");
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(listAuth0Users(0, 50)).rejects.toThrow();
  });

  it("should surface machine-to-machine application search failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchAuth0ClientsByName("bot")).rejects.toThrow();
  });

  it("should limit the machine-to-machine applications returned", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { client_id: "1", name: "A" },
        { client_id: "2", name: "B" },
      ],
    });
    await expect(searchAuth0ClientsByName("", 1)).resolves.toEqual([
      { client_id: "1", name: "A" },
    ]);
  });
});
