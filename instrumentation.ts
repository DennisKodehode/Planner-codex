export async function register() {
  if (process.env.NODE_ENV === 'development') {
    console.info('Observability hooks registered.');
  }
}
