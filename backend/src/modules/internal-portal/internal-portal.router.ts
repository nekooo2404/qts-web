import { Router, type RequestHandler } from 'express';

import { ApiError } from '../../common/api-error.js';
import { getAuthenticatedUser, authenticate, requirePermission } from '../../middleware/authenticate.js';
import {
  createPermissionController,
  createRoleController,
  createUserController,
  deletePermissionController,
  deleteRoleController,
  deleteUserController,
  getPermissionController,
  getRoleController,
  getUserController,
  listPermissionsController,
  listRolesController,
  listUsersController,
  replaceRolePermissionsController,
  replaceUserRolesController,
  updatePermissionController,
  updateRoleController,
  updateUserController,
} from '../access-management/access-management.controller.js';
import type { AccessManagementRepository } from '../access-management/access-management.repository.js';
import { listAuditLogsController } from '../audit/audit.controller.js';
import {
  createInternalAuditMiddleware,
  type AuditLogger,
} from '../audit/audit.middleware.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { AccessTokenService } from '../auth/access-token.service.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import { hashPassword } from '../auth/password.js';
import {
  createCmsMetricController,
  createCmsProjectController,
  createCmsSolutionController,
  deleteCmsMetricController,
  deleteCmsProjectController,
  deleteCmsSolutionController,
  getCmsMetricController,
  getCmsProjectController,
  getCmsSolutionController,
  getCompanyProfileController,
  listCmsMetricsController,
  listCmsProjectsController,
  listCmsSolutionsController,
  updateCmsMetricController,
  updateCmsProjectController,
  updateCmsSolutionController,
  updateCompanyProfileController,
} from '../cms/cms.controller.js';
import type { CmsRepository } from '../cms/cms.repository.js';
import {
  createContractController,
  deleteContractController,
  getContractController,
  listContractsController,
  updateContractController,
} from '../contracts/contract.controller.js';
import type { ContractRepository } from '../contracts/contract.repository.js';
import {
  generateContractDocumentController,
  type ContractDocumentGenerator,
} from '../contracts/document-generation.controller.js';
import { downloadArchiveController } from '../files/archive-download.controller.js';
import type { ArchiveDownloadAdmissionController } from '../files/archive-download-admission.js';
import type { ArchiveRepository } from '../files/archive.repository.js';
import type { FileStorage } from '../files/file-storage.js';
import {
  assignLeadController,
  listAssignedLeadsController,
} from '../leads/lead.controller.js';
import type { LeadRepository } from '../leads/lead.repository.js';
import {
  assignTaskController,
  changeTaskStatusController,
  createTaskController,
  deleteTaskController,
  getTaskController,
  listTasksController,
  updateTaskController,
} from '../tasks/task.controller.js';
import type { TaskRepository } from '../tasks/task.repository.js';

export interface InternalPortalDependencies {
  authRepository: AuthRepository;
  tokenService: AccessTokenService;
  leadRepository: LeadRepository;
  contractRepository: ContractRepository;
  taskRepository: TaskRepository;
  accessManagementRepository: AccessManagementRepository;
  cmsRepository: CmsRepository;
  auditRepository?: AuditRepository;
  auditIpHashSecret?: string;
  auditLogger?: AuditLogger;
  archiveDownload?: {
    repository: ArchiveRepository;
    storage: FileStorage;
    maxArchiveBytes: number;
    admissionController: ArchiveDownloadAdmissionController;
    retryAfterSeconds: number;
  };
  contractDocumentGenerator?: ContractDocumentGenerator;
}

const actorId = (_request: unknown, response: { locals: object }) =>
  getAuthenticatedUser(response.locals).userId;
const taskAccess = (_request: unknown, response: { locals: object }) => {
  const actor = getAuthenticatedUser(response.locals);
  return {
    actorId: actor.userId,
    canManageAll: actor.permissions.has('assign:task'),
    canManageAllContracts: actor.permissions.has('manage:contract'),
    canManageAllLeads: actor.permissions.has('assign:lead'),
  };
};
const contractAccess = (_request: unknown, response: { locals: object }) => {
  const actor = getAuthenticatedUser(response.locals);
  return {
    actorId: actor.userId,
    canManageAll: actor.permissions.has('manage:contract'),
  };
};

export function createInternalPortalRouter(
  dependencies: InternalPortalDependencies,
): Router {
  const router = Router();
  const protectedPrefixes = [
    '/leads',
    '/contracts',
    '/files',
    '/tasks',
    '/admin',
  ];
  router.use(
    protectedPrefixes,
    authenticate({
      repository: dependencies.authRepository,
      tokenService: dependencies.tokenService,
    }),
  );
  if (dependencies.auditRepository && dependencies.auditIpHashSecret) {
    router.use(
      protectedPrefixes,
      createInternalAuditMiddleware({
        repository: dependencies.auditRepository,
        ipHashSecret: dependencies.auditIpHashSecret,
        ...(dependencies.auditLogger
          ? { logger: dependencies.auditLogger }
          : {}),
      }),
    );
  }

  const requireJson: RequestHandler = (request, _response, next) => {
    if (
      ['POST', 'PUT', 'PATCH'].includes(request.method) &&
      !request.is('application/json')
    ) {
      next(
        new ApiError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json',
        ),
      );
      return;
    }
    next();
  };
  router.use(['/contracts', '/tasks', '/admin'], requireJson);

  router.get('/leads/assigned', requirePermission('read:lead'), listAssignedLeadsController(dependencies.leadRepository, actorId));
  router.put(
    '/admin/leads/:id/assignee',
    requirePermission('assign:lead'),
    assignLeadController(dependencies.leadRepository, actorId),
  );

  router.get(
    '/contracts',
    requirePermission('read:contract'),
    listContractsController(dependencies.contractRepository, contractAccess),
  );
  router.post(
    '/contracts',
    requirePermission('write:contract'),
    createContractController(dependencies.contractRepository, contractAccess),
  );
  if (dependencies.contractDocumentGenerator) {
    router.post(
      '/contracts/generate',
      requirePermission('generate:contract'),
      generateContractDocumentController({
        generator: dependencies.contractDocumentGenerator,
        resolveActor: (_request, response) => ({ id: actorId(_request, response) }),
      }),
    );
  }
  router.get(
    '/contracts/:id',
    requirePermission('read:contract'),
    getContractController(dependencies.contractRepository, contractAccess),
  );
  router.patch(
    '/contracts/:id',
    requirePermission('write:contract'),
    updateContractController(dependencies.contractRepository, contractAccess),
  );
  router.delete(
    '/contracts/:id',
    requirePermission('write:contract'),
    deleteContractController(dependencies.contractRepository, contractAccess),
  );

  if (dependencies.archiveDownload) {
    router.get(
      '/files/archives/:id/download',
      requirePermission('read:file'),
      downloadArchiveController({
        ...dependencies.archiveDownload,
        resolveActor: (_request, response) => ({ id: actorId(_request, response) }),
      }),
    );
  }

  router.get('/tasks', requirePermission('read:task'), listTasksController(dependencies.taskRepository, taskAccess));
  router.post('/tasks', requirePermission('write:task'), createTaskController(dependencies.taskRepository, taskAccess));
  router.get('/tasks/:id', requirePermission('read:task'), getTaskController(dependencies.taskRepository, taskAccess));
  router.patch('/tasks/:id', requirePermission('write:task'), updateTaskController(dependencies.taskRepository, taskAccess));
  router.delete('/tasks/:id', requirePermission('write:task'), deleteTaskController(dependencies.taskRepository, taskAccess));
  router.put('/tasks/:id/status', requirePermission('write:task'), changeTaskStatusController(dependencies.taskRepository, taskAccess));
  router.put('/tasks/:id/assignee', requirePermission('assign:task'), assignTaskController(dependencies.taskRepository, actorId));

  const users = requirePermission('manage:user');
  router.get('/admin/users', users, listUsersController(dependencies.accessManagementRepository));
  router.post(
    '/admin/users',
    users,
    requirePermission('manage:role'),
    createUserController(dependencies.accessManagementRepository, hashPassword, actorId),
  );
  router.get('/admin/users/:id', users, getUserController(dependencies.accessManagementRepository));
  router.patch(
    '/admin/users/:id',
    users,
    requirePermission('manage:role'),
    updateUserController(dependencies.accessManagementRepository, hashPassword, actorId),
  );
  router.delete('/admin/users/:id', users, deleteUserController(dependencies.accessManagementRepository, actorId));
  router.put(
    '/admin/users/:id/roles',
    users,
    requirePermission('manage:role'),
    replaceUserRolesController(dependencies.accessManagementRepository, actorId),
  );

  const roles = requirePermission('manage:role');
  router.get('/admin/roles', roles, listRolesController(dependencies.accessManagementRepository));
  router.post('/admin/roles', roles, createRoleController(dependencies.accessManagementRepository, actorId));
  router.get('/admin/roles/:id', roles, getRoleController(dependencies.accessManagementRepository));
  router.patch('/admin/roles/:id', roles, updateRoleController(dependencies.accessManagementRepository, actorId));
  router.delete('/admin/roles/:id', roles, deleteRoleController(dependencies.accessManagementRepository, actorId));
  router.put('/admin/roles/:id/permissions', roles, replaceRolePermissionsController(dependencies.accessManagementRepository, actorId));
  router.get('/admin/permissions', roles, listPermissionsController(dependencies.accessManagementRepository));
  router.post('/admin/permissions', roles, createPermissionController(dependencies.accessManagementRepository, actorId));
  router.get('/admin/permissions/:id', roles, getPermissionController(dependencies.accessManagementRepository));
  router.patch('/admin/permissions/:id', roles, updatePermissionController(dependencies.accessManagementRepository, actorId));
  router.delete('/admin/permissions/:id', roles, deletePermissionController(dependencies.accessManagementRepository, actorId));
  if (dependencies.auditRepository) {
    router.get(
      '/admin/audit-logs',
      requirePermission('read:audit'),
      listAuditLogsController(dependencies.auditRepository),
    );
  }

  const cms = requirePermission('manage:web_public');
  router.get('/admin/cms/projects', cms, listCmsProjectsController(dependencies.cmsRepository));
  router.post('/admin/cms/projects', cms, createCmsProjectController(dependencies.cmsRepository, actorId));
  router.get('/admin/cms/projects/:id', cms, getCmsProjectController(dependencies.cmsRepository));
  router.patch('/admin/cms/projects/:id', cms, updateCmsProjectController(dependencies.cmsRepository, actorId));
  router.delete('/admin/cms/projects/:id', cms, deleteCmsProjectController(dependencies.cmsRepository, actorId));
  router.get('/admin/cms/solutions', cms, listCmsSolutionsController(dependencies.cmsRepository));
  router.post('/admin/cms/solutions', cms, createCmsSolutionController(dependencies.cmsRepository, actorId));
  router.get('/admin/cms/solutions/:id', cms, getCmsSolutionController(dependencies.cmsRepository));
  router.patch('/admin/cms/solutions/:id', cms, updateCmsSolutionController(dependencies.cmsRepository, actorId));
  router.delete('/admin/cms/solutions/:id', cms, deleteCmsSolutionController(dependencies.cmsRepository, actorId));
  router.get('/admin/cms/metrics', cms, listCmsMetricsController(dependencies.cmsRepository));
  router.post('/admin/cms/metrics', cms, createCmsMetricController(dependencies.cmsRepository, actorId));
  router.get('/admin/cms/metrics/:id', cms, getCmsMetricController(dependencies.cmsRepository));
  router.patch('/admin/cms/metrics/:id', cms, updateCmsMetricController(dependencies.cmsRepository, actorId));
  router.delete('/admin/cms/metrics/:id', cms, deleteCmsMetricController(dependencies.cmsRepository, actorId));
  router.get('/admin/cms/company-profile', cms, getCompanyProfileController(dependencies.cmsRepository));
  router.patch('/admin/cms/company-profile', cms, updateCompanyProfileController(dependencies.cmsRepository, actorId));

  return router;
}
