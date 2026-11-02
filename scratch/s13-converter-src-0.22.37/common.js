"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubConverter = exports.GitHubCommon = void 0;
const crypto_1 = require("crypto");
const faros_js_client_1 = require("faros-js-client");
const lodash_1 = require("lodash");
const converter_1 = require("../converter");
/** Common functions shares across GitHub converters */
class GitHubCommon {
    static vcs_User_with_Membership(user, source) {
        const vcsUser = GitHubCommon.vcs_User(user, source);
        if (!vcsUser)
            return [];
        const repository = GitHubCommon.parseRepositoryKey(user.repository, source);
        if (!repository)
            return [vcsUser];
        const vcsMembership = GitHubCommon.vcs_Membership(
        // @ts-ignore property uid does not exist on union
        vcsUser.record.uid, repository.organization.uid, repository.organization.source);
        return [vcsUser, vcsMembership];
    }
    static vcs_UserType(user) {
        if (!user.type) {
            return { category: 'Custom', detail: 'unknown' };
        }
        const userTypeLower = user.type.toLowerCase();
        switch (userTypeLower) {
            case 'enterpriseuseraccount':
            case 'user':
                return { category: 'User', detail: userTypeLower };
            case 'bot':
                return { category: 'Bot', detail: userTypeLower };
            case 'organization':
                return { category: 'Organization', detail: userTypeLower };
            case 'mannequin':
                return { category: 'Mannequin', detail: userTypeLower };
            default:
                return { category: 'Custom', detail: userTypeLower };
        }
    }
    static vcs_User(user, source) {
        // don't create a user w/ undefined uid
        if (!user.login) {
            return undefined;
        }
        const type = GitHubCommon.vcs_UserType(user);
        return {
            model: 'vcs_User',
            record: {
                uid: user.login,
                name: user.name ?? user.login ?? null,
                htmlUrl: user.html_url ?? null,
                type,
                source,
            },
        };
    }
    static vcs_Membership(userUid, org, source) {
        return {
            model: 'vcs_Membership',
            record: {
                user: { uid: userUid, source },
                organization: { uid: (0, lodash_1.toLower)(org), source },
            },
        };
    }
    static tms_User(user, source) {
        if (!user?.login)
            return undefined;
        return {
            model: 'tms_User',
            record: {
                uid: user.login,
                name: user.name ?? user.login ?? null,
                source,
            },
        };
    }
    static tms_ProjectBoard_with_TaskBoard(projectKey, name, description, createdAt, updatedAt, writeInclusion = false) {
        const res = [
            {
                model: 'tms_Project',
                record: {
                    ...projectKey,
                    name: name,
                    description: faros_js_client_1.Utils.cleanAndTruncate(description, GitHubCommon.MAX_DESCRIPTION_LENGTH),
                    createdAt: faros_js_client_1.Utils.toDate(createdAt),
                    updatedAt: faros_js_client_1.Utils.toDate(updatedAt),
                },
            },
            {
                model: 'tms_TaskBoard',
                record: {
                    ...projectKey,
                    name,
                },
            },
            {
                model: 'tms_TaskBoardProjectRelationship',
                record: {
                    board: projectKey,
                    project: projectKey,
                },
            },
        ];
        if (writeInclusion) {
            res.push({
                model: 'faros_TmsTaskBoardOptions',
                record: {
                    board: projectKey,
                    inclusion: { category: 'Included' },
                },
            });
        }
        return res;
    }
    static parseRepositoryKey(repository, source) {
        if (!repository)
            return undefined;
        const orgRepo = repository.split('/');
        if (orgRepo.length != 2)
            return undefined;
        const [organization, repositoryName] = orgRepo;
        return GitHubCommon.repoKey(organization, repositoryName, source);
    }
    static parsePRnumber(pull_request_url) {
        return faros_js_client_1.Utils.parseInteger(pull_request_url.substring(pull_request_url.lastIndexOf('/') + 1));
    }
    static cicd_BuildStatus(status, conclusion) {
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'queued':
                return { category: 'Queued', detail: statusLower };
            case 'in_progress':
                return { category: 'Running', detail: statusLower };
            case 'completed':
                return GitHubCommon.buildStatus(conclusion);
            default:
                return { category: 'Custom', detail: statusLower };
        }
    }
    static repoKey(org, repo, source) {
        return {
            uid: (0, lodash_1.toLower)(repo),
            name: (0, lodash_1.toLower)(repo),
            organization: {
                uid: (0, lodash_1.toLower)(org),
                source,
            },
        };
    }
    static cicdRepoKey(repoKey) {
        return (0, lodash_1.pick)(repoKey, ['uid', 'organization']);
    }
    static pullRequestKey(number, org, repo, source) {
        return {
            uid: number.toString(),
            number: number,
            repository: this.repoKey(org, repo, source),
        };
    }
    static vulnerabilityUid(org, repo, alertType, number) {
        return (0, lodash_1.toLower)(`${org}/${repo}/${alertType}/${number}`);
    }
    static vulnerabilityType(alert, alertType) {
        switch (alertType) {
            case 'code-scanning':
                if (!(0, lodash_1.isEmpty)(alert.rule.security_severity_level)) {
                    return {
                        category: 'Security',
                        detail: 'security code-scanning alert',
                    };
                }
                else {
                    return {
                        category: 'CodingError',
                        detail: 'non-security code-scanning alert',
                    };
                }
            case 'dependabot':
                return {
                    category: 'Dependency',
                    detail: 'dependabot alert',
                };
            case 'secret-scanning':
                return {
                    category: 'SecretLeak',
                    detail: 'secret-scanning alert',
                };
        }
    }
    static vulnerabilityStatus(alert) {
        const state = alert.state;
        switch (state) {
            case 'open':
                return { category: 'Open', detail: state };
            case 'dismissed':
                return {
                    category: 'Ignored',
                    detail: alert.dismissed_reason ?? state,
                };
            case 'auto_dismissed':
                return { category: 'Ignored', detail: state };
            case 'fixed':
                return { category: 'Resolved', detail: state };
            case 'resolved':
                return { category: 'Resolved', detail: alert.resolution ?? state };
            default:
                return { category: 'Custom', detail: state };
        }
    }
    static buildStatus(conclusion) {
        const conclusionLower = conclusion.toLowerCase();
        switch (conclusionLower) {
            case 'success':
                return { category: 'Success', detail: conclusionLower };
            case 'failure':
                return { category: 'Failed', detail: conclusionLower };
            case 'cancelled':
                return { category: 'Canceled', detail: conclusionLower };
            default:
                return { category: 'Custom', detail: conclusionLower };
        }
    }
    static digest(input) {
        return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
    }
    static enterpriseUid(enterpriseSlug) {
        return `enterprise:${(0, lodash_1.toLower)(enterpriseSlug)}`;
    }
}
exports.GitHubCommon = GitHubCommon;
// Max length for free-form description text fields such as issue body
GitHubCommon.MAX_DESCRIPTION_LENGTH = 1000;
/** Github converter base */
class GitHubConverter extends converter_1.Converter {
    constructor() {
        super(...arguments);
        this.source = 'GitHub';
        this.collectedUsers = new Map();
    }
    /** All Github records should have id property */
    id(record) {
        return record?.record?.data?.id;
    }
    collectUser(user, potentialEmails = []) {
        if (!user?.login)
            return;
        if (!this.collectedUsers.has(user.login)) {
            this.collectedUsers.set(user.login, { users: [], additionalEmails: [] });
        }
        const collectedUser = this.collectedUsers.get(user.login);
        collectedUser.users.push({
            ...user,
            email: isValidEmail(user.email) ? user.email : null,
        });
        collectedUser.additionalEmails.push(...potentialEmails.filter((email) => isValidEmail(email, true)));
    }
    convertUsers() {
        const res = [];
        for (const [login, { users, additionalEmails }] of this.collectedUsers.entries()) {
            const emails = new Set(users.map((user) => user.email).filter((email) => !!email));
            additionalEmails.forEach((email) => emails.add(email));
            for (const email of emails) {
                res.push({
                    model: 'vcs_UserEmail',
                    record: {
                        user: { uid: login, source: this.streamName.source },
                        email,
                    },
                });
            }
            const orgs = new Set(users.map((user) => user.org).filter((org) => !(0, lodash_1.isEmpty)(org)));
            for (const org of orgs) {
                res.push({
                    model: 'vcs_Membership',
                    record: {
                        user: { uid: login, source: this.streamName.source },
                        organization: { uid: (0, lodash_1.toLower)(org), source: this.streamName.source },
                    },
                });
            }
            const finalUser = this.getFinalUser(users);
            res.push({
                model: 'vcs_User',
                record: (0, lodash_1.omitBy)({
                    uid: login,
                    source: this.streamName.source,
                    name: finalUser.name,
                    email: finalUser.email || additionalEmails[0],
                    htmlUrl: finalUser.html_url,
                    type: GitHubCommon.vcs_UserType(finalUser),
                }, (value) => (0, lodash_1.isNil)(value) || (0, lodash_1.isEmpty)(value)),
            });
        }
        return res;
    }
    convertTMSUsers() {
        const res = [];
        for (const [login, { users }] of this.collectedUsers.entries()) {
            const finalUser = this.getFinalUser(users);
            res.push({
                model: 'tms_User',
                record: (0, lodash_1.omitBy)({
                    uid: login,
                    source: this.streamName.source,
                    name: finalUser.name,
                }, (value) => (0, lodash_1.isNil)(value) || (0, lodash_1.isEmpty)(value)),
            });
        }
        return res;
    }
    // Replace non-null user attributes to our copy of the user
    // e.g. login, name, email, type, html_url.
    getFinalUser(users) {
        const finalUser = {};
        for (const user of users) {
            for (const key in user) {
                if (!finalUser[key] && user[key]) {
                    finalUser[key] = user[key];
                }
            }
        }
        return finalUser;
    }
    cicdEnabled(ctx) {
        return ctx.getSourceConfig()?.cicdEnabled ?? false;
    }
}
exports.GitHubConverter = GitHubConverter;
function isValidEmail(email, validateFormat = false) {
    let valid = !(0, lodash_1.isEmpty)(email) && !email.includes('@users.noreply.github.com');
    if (valid && validateFormat) {
        valid = email.includes('@'); // prefer flexibility over strict validation
    }
    return valid;
}
//# sourceMappingURL=common.js.map