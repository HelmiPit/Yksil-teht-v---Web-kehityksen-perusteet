const fetchData = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `Virhe ${response.status}`;

    try {
      const errorData: unknown = await response.json();

      if (typeof errorData === 'object' && errorData !== null) {
        const data = errorData as Record<string, unknown>;

        const message = data.message ?? data.error;

        if (typeof message === 'string') {
          errorMessage = message;
        }
      }
    } catch {
      // Palvelimen vastaus ei ollut JSON-muodossa.
    }

    throw new Error(errorMessage);
  }

  const json = (await response.json()) as T;

  return json;
};

export { fetchData };