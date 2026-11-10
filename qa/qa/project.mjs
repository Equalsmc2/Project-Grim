import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { default: profile } = await import(pathToFileURL(resolve(process.env.QA_PROFILE || 'qa.project.mjs')).href);
export const project = {
  ...profile,
  baseURL: process.env.QA_BASE_URL || profile.baseURL,
  command: process.env.QA_EXTERNAL === '1' ? undefined : (process.env.QA_START_COMMAND || profile.command),
  visual: process.env.QA_VISUAL || profile.visual
};
if (!/^[a-z0-9-]+$/.test(project.name)) throw new Error('Project name must use lowercase letters, digits and hyphens.');
if (!['capture', 'compare'].includes(project.visual)) throw new Error('QA_VISUAL must be capture or compare.');
if (!project.routes?.length || !project.testMatch?.length) throw new Error('Configure routes and testMatch.');
new URL(project.baseURL);
