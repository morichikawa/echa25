#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const envSuffix = process.env.ENV_SUFFIX || 'dev';
const app = new cdk.App();
new BackendStack(app, `Echa25BackendStack-${envSuffix}`, { envSuffix });
