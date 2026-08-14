import express from 'express';
import request from 'supertest';
import { describe,expect,it,vi } from 'vitest';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { createCmsProjectController,deleteCmsProjectController,updateCompanyProfileController } from '../../src/modules/cms/cms.controller.js';
import type { CmsRepository } from '../../src/modules/cms/cms.repository.js';

function repo(overrides:Partial<CmsRepository>={}):CmsRepository{return{listProjects:vi.fn(),findProjectById:vi.fn(),createProject:vi.fn(),updateProject:vi.fn(),archiveProject:vi.fn(),listSolutions:vi.fn(),findSolutionById:vi.fn(),createSolution:vi.fn(),updateSolution:vi.fn(),archiveSolution:vi.fn(),listMetrics:vi.fn(),findMetricById:vi.fn(),createMetric:vi.fn(),updateMetric:vi.fn(),archiveMetric:vi.fn(),getCompanyProfile:vi.fn(),updateCompanyProfile:vi.fn(),...overrides};}
const actor='f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';
function appFor(register:(a:express.Express)=>void){const a=express();a.use(express.json());register(a);a.use(errorHandler);return a;}

describe('CMS controllers',()=>{
 it('creates a draft project by default',async()=>{const createProject=vi.fn(async()=>({id:'ef3856b6-7e74-4667-b4fa-8308cdfd405d',title:'SOC',description:'Security operations center',imageUrl:'https://cdn.example.com/soc.webp',category:'Cybersecurity',status:'DRAFT' as const,sortOrder:0,publishedAt:null,createdAt:new Date('2026-08-13T12:00:00Z'),updatedAt:new Date('2026-08-13T12:00:00Z')}));const a=appFor(x=>x.post('/projects',createCmsProjectController(repo({createProject}),()=>actor)));const r=await request(a).post('/projects').send({title:'SOC',description:'Security operations center',imageUrl:'https://cdn.example.com/soc.webp',category:'Cybersecurity'});expect(r.status).toBe(201);expect(createProject).toHaveBeenCalledWith(expect.objectContaining({status:'DRAFT'}),actor);});
 it('archives a project instead of deleting public history',async()=>{const archiveProject=vi.fn(async()=>true);const a=appFor(x=>x.delete('/projects/:id',deleteCmsProjectController(repo({archiveProject}),()=>actor)));const r=await request(a).delete('/projects/ef3856b6-7e74-4667-b4fa-8308cdfd405d');expect(r.status).toBe(204);expect(archiveProject).toHaveBeenCalledWith('ef3856b6-7e74-4667-b4fa-8308cdfd405d',actor);});
 it('updates the singleton About/company profile',async()=>{const updateCompanyProfile=vi.fn(async()=>({about:'QTS protects digital operations.',vision:'Trusted technology partner',mission:'Secure transformation',address:'Ha Noi',hotline:'+842473000888',updatedAt:new Date('2026-08-13T12:00:00Z')}));const a=appFor(x=>x.patch('/company-profile',updateCompanyProfileController(repo({updateCompanyProfile}),()=>actor)));const r=await request(a).patch('/company-profile').send({about:'QTS protects digital operations.'});expect(r.status).toBe(200);expect(updateCompanyProfile).toHaveBeenCalledWith({about:'QTS protects digital operations.'},actor);});
});
