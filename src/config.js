export const config = {
  port: Number(process.env.PORT || 8080),
  image: process.env.LCVA_DESKTOP_IMAGE || 'lcva/desktop:latest',
  sessionTtlMinutes: Number(process.env.LCVA_SESSION_TTL_MINUTES || 120),
  dockerNetwork: process.env.LCVA_DOCKER_NETWORK || 'bridge',
  containerMemory: process.env.LCVA_CONTAINER_MEMORY || '1g',
  containerCpus: Number(process.env.LCVA_CONTAINER_CPUS || 1),
  adminUsername: process.env.LCVA_ADMIN_USERNAME || 'admin',
  adminPassword: process.env.LCVA_ADMIN_PASSWORD || 'admin',
};
