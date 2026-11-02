"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarosRepositories = void 0;
const faros_js_client_1 = require("faros-js-client");
const common_1 = require("./common");
class FarosRepositories extends common_1.GitHubConverter {
    constructor() {
        super(...arguments);
        this.destinationModels = [
            'cicd_Repository',
            'compute_Application',
            'tms_Project',
            'tms_TaskBoard',
            'tms_TaskBoardProjectRelationship',
            'vcs_Repository',
            'vcs_RepositoryTag',
        ];
    }
    async convert(record, ctx) {
        const repo = record.record.data;
        const repoKey = common_1.GitHubCommon.repoKey(repo.org, repo.name, this.streamName.source);
        const res = [
            {
                model: 'vcs_Repository',
                record: {
                    ...repoKey,
                    fullName: repo.full_name,
                    private: repo.private,
                    description: faros_js_client_1.Utils.cleanAndTruncate(repo.description),
                    language: repo.language ?? null,
                    size: repo.size,
                    mainBranch: repo.default_branch,
                    htmlUrl: repo.html_url,
                    topics: repo.topics?.filter((t) => t),
                    createdAt: faros_js_client_1.Utils.toDate(repo?.created_at),
                    updatedAt: faros_js_client_1.Utils.toDate(repo?.updated_at),
                    pushedAt: faros_js_client_1.Utils.toDate(repo?.pushed_at),
                    archived: repo.archived,
                },
            },
        ];
        if (repo.languages) {
            for (const { language, bytes } of repo.languages) {
                const tagKey = {
                    uid: `githubLanguageBytes__${repo.org}__${repo.name}__${language}`,
                };
                res.push({
                    model: 'faros_Tag',
                    record: {
                        ...tagKey,
                        key: `Language__${language}`,
                        value: bytes.toString(),
                    },
                }, {
                    model: 'vcs_RepositoryTag',
                    record: {
                        tag: tagKey,
                        repository: repoKey,
                    },
                });
            }
        }
        const writeInclusion = repo.syncRepoData;
        if (repo.syncRepoData && repo.tmsEnabled) {
            const projectUid = `${repoKey.organization.uid}/${repoKey.name}`;
            res.push(...common_1.GitHubCommon.tms_ProjectBoard_with_TaskBoard({
                uid: projectUid,
                source: this.streamName.source,
            }, projectUid, repo.description, repo.created_at, repo.updated_at, writeInclusion));
        }
        if (writeInclusion) {
            res.push({
                model: 'faros_VcsRepositoryOptions',
                record: {
                    repository: repoKey,
                    inclusion: { category: 'Included' },
                },
            });
        }
        if (this.cicdEnabled(ctx)) {
            res.push({
                model: 'compute_Application',
                record: {
                    name: `${repoKey.organization.uid}/${repoKey.name}`,
                    platform: this.streamName.source,
                },
            });
            res.push({
                model: 'cicd_Repository',
                record: {
                    ...common_1.GitHubCommon.cicdRepoKey(repoKey),
                    name: repo.name,
                    description: faros_js_client_1.Utils.cleanAndTruncate(repo.description),
                    url: repo.html_url,
                },
            });
        }
        return res;
    }
}
exports.FarosRepositories = FarosRepositories;
//# sourceMappingURL=faros_repositories.js.map