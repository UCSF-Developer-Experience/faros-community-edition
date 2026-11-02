"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarosPullRequests = void 0;
const faros_js_client_1 = require("faros-js-client");
const lodash_1 = require("lodash");
const types_1 = require("../../common/types");
const vcs_1 = require("../common/vcs");
const common_1 = require("./common");
class FarosPullRequests extends common_1.GitHubConverter {
    constructor() {
        super(...arguments);
        this.collectedBranches = new Map();
        this.fileCollector = new vcs_1.FileCollector();
        this.collectedLabels = new Set();
        this.prFileAssoc = new Map();
        this.prKeyMap = new Map();
        this.destinationModels = [
            'vcs_Branch',
            'vcs_File',
            'vcs_Label',
            'vcs_PullRequest',
            'vcs_PullRequestFile',
            'vcs_PullRequestLabel',
            'vcs_PullRequestReview',
            'vcs_PullRequestReviewRequest',
            'qa_CodeQuality',
        ];
    }
    initialize(ctx) {
        if (this.fetchingPrFiles !== undefined) {
            return;
        }
        this.fetchingPrFiles =
            ctx.getSourceConfig()?.fetch_pull_request_files ?? false;
    }
    async convert(record, ctx) {
        this.initialize(ctx);
        const pr = record.record.data;
        const prKey = common_1.GitHubCommon.pullRequestKey(pr.number, pr.org, pr.repo, this.streamName.source);
        this.collectUser(pr.author);
        // Github PR states
        const prStates = ['closed', 'merged', 'open'];
        const stateDetail = pr.isDraft ? 'DRAFT' : pr.state;
        const state = prStates.includes(pr.state.toLowerCase())
            ? { category: (0, lodash_1.upperFirst)((0, lodash_1.camelCase)(pr.state)), detail: stateDetail }
            : { category: 'Custom', detail: stateDetail };
        const lastReviewEvent = (0, lodash_1.last)(pr.reviewEvents?.nodes ?? []);
        let readyForReviewAt = null;
        if (!lastReviewEvent && !pr.isDraft) {
            readyForReviewAt = faros_js_client_1.Utils.toDate(pr.createdAt);
        }
        else if (lastReviewEvent?.type === 'ReadyForReviewEvent') {
            readyForReviewAt = faros_js_client_1.Utils.toDate(lastReviewEvent?.createdAt);
        }
        const sourceBranch = this.collectBranch(pr.headRefName, pr.headRepository);
        const targetBranch = this.collectBranch(pr.baseRefName, pr.baseRepository);
        // Ensure if we fail to get branch info we do not overwrite the previous branch info
        // since we should always have branches for a PR
        const branchInfo = (0, lodash_1.omitBy)({
            sourceBranch,
            sourceBranchName: pr.headRefName,
            targetBranch,
            targetBranchName: pr.baseRefName,
        }, lodash_1.isNil);
        const repoKey = common_1.GitHubCommon.repoKey(pr.org, pr.repo, this.streamName.source);
        pr.files.forEach((file) => {
            this.fileCollector.collectFile(file.path, repoKey);
        });
        pr.labels.forEach((label) => {
            this.collectedLabels.add(label.name);
        });
        let reviewCommentCount = 0;
        const reviewSubmissionComments = [];
        pr.reviews.forEach((review) => {
            reviewCommentCount += review.comments.totalCount;
            if (review.body) {
                reviewSubmissionComments.push({
                    model: 'vcs_PullRequestComment',
                    record: {
                        number: review.databaseId,
                        // @ts-ignore uid does not exist on Partial<vcs_PullRequestComment>
                        uid: review.databaseId.toString(),
                        comment: faros_js_client_1.Utils.cleanAndTruncate(review.body, common_1.GitHubCommon.MAX_DESCRIPTION_LENGTH),
                        createdAt: faros_js_client_1.Utils.toDate(review.submittedAt),
                        updatedAt: faros_js_client_1.Utils.toDate(review.updatedAt),
                        author: review.author?.login
                            ? { uid: review.author.login, source: this.streamName.source }
                            : null,
                        pullRequest: prKey,
                    },
                });
            }
            this.collectUser(review.author);
        });
        const requestedReviewers = this.collectReviewRequestReviewers(pr.reviewRequests);
        const qa_CodeQuality = [];
        if (pr.coverage) {
            // @ts-ignore type error
            qa_CodeQuality.push({
                model: 'qa_CodeQuality',
                record: {
                    uid: pr.coverage.commitSha,
                    coverage: {
                        category: 'Coverage',
                        type: 'Percent',
                        name: 'Coverage',
                        value: pr.coverage.coveragePercentage,
                    },
                    createdAt: faros_js_client_1.Utils.toDate(pr.coverage.createdAt),
                    pullRequest: prKey,
                    commit: {
                        sha: pr.coverage.commitSha,
                        repository: repoKey,
                    },
                    repository: repoKey,
                },
            });
        }
        const prKeyStr = `${prKey.repository.organization.uid}/${prKey.repository.uid}/${prKey.number}`;
        this.prKeyMap.set(prKeyStr, prKey);
        this.prFileAssoc.set(prKeyStr, pr.files.map((file) => ({
            model: 'vcs_PullRequestFile',
            record: {
                pullRequest: prKey,
                file: { uid: file.path, repository: repoKey },
                additions: file.additions,
                deletions: file.deletions,
            },
        })));
        return [
            {
                model: 'vcs_PullRequest',
                record: {
                    ...prKey,
                    title: pr.title,
                    description: faros_js_client_1.Utils.cleanAndTruncate(pr.body),
                    state,
                    htmlUrl: pr.url,
                    createdAt: faros_js_client_1.Utils.toDate(pr.createdAt),
                    updatedAt: faros_js_client_1.Utils.toDate(pr.updatedAt),
                    mergedAt: faros_js_client_1.Utils.toDate(pr.mergedAt),
                    closedAt: faros_js_client_1.Utils.toDate(pr.closedAt),
                    readyForReviewAt,
                    commitCount: pr.commits.totalCount,
                    commentCount: pr.comments.totalCount +
                        reviewCommentCount +
                        reviewSubmissionComments.length,
                    diffStats: {
                        linesAdded: pr.additions,
                        linesDeleted: pr.deletions,
                        filesChanged: pr.changedFiles,
                    },
                    author: pr.author?.login
                        ? { uid: pr.author.login, source: this.streamName.source }
                        : null,
                    mergeCommit: pr.mergeCommit
                        ? {
                            repository: repoKey,
                            sha: pr.mergeCommit.oid,
                            // @ts-ignore uid does not exist on vcs_Commit
                            uid: pr.mergeCommit.oid,
                        }
                        : null,
                    ...branchInfo,
                },
            },
            ...pr.labels.map((label) => ({
                model: 'vcs_PullRequestLabel',
                record: {
                    pullRequest: prKey,
                    label: { name: label.name },
                },
            })),
            ...pr.reviews.map((review) => ({
                model: 'vcs_PullRequestReview',
                record: {
                    number: review.databaseId,
                    // @ts-ignore uid does not exist on Partial<vcs_PullRequestReview>
                    uid: review.databaseId.toString(),
                    htmlUrl: review.url,
                    pullRequest: prKey,
                    reviewer: review.author?.login
                        ? { uid: review.author.login, source: this.streamName.source }
                        : null,
                    state: getReviewState(review.state),
                    submittedAt: faros_js_client_1.Utils.toDate(review.submittedAt),
                },
            })),
            ...requestedReviewers.map((reviewer) => ({
                model: 'vcs_PullRequestReviewRequest',
                record: {
                    pullRequest: prKey,
                    requestedReviewer: reviewer.login
                        ? { uid: reviewer.login, source: this.streamName.source }
                        : null,
                    asCodeOwner: reviewer.asCodeOwner,
                },
            })),
            ...reviewSubmissionComments,
            ...qa_CodeQuality,
        ];
    }
    // Collects users and returns a list containing reviewers with login and asCodeOwner status
    collectReviewRequestReviewers(reviewRequests) {
        const reviewers = new Map();
        reviewRequests
            .filter((reviewRequest) => reviewRequest?.requestedReviewer?.type)
            .forEach((reviewRequest) => {
            const requestedReviewer = reviewRequest.requestedReviewer;
            const asCodeOwner = reviewRequest?.asCodeOwner ?? false;
            if (requestedReviewer.type === 'Team' &&
                requestedReviewer.members?.nodes) {
                requestedReviewer.members.nodes.forEach((member) => this.addReviewer(reviewers, member, asCodeOwner));
            }
            else if (requestedReviewer.type === 'User' ||
                requestedReviewer.type === 'Mannequin') {
                this.addReviewer(reviewers, requestedReviewer, asCodeOwner);
            }
        });
        return Array.from(reviewers.values());
    }
    addReviewer(reviewers, reviewer, asCodeOwner) {
        if (!reviewer.login)
            return;
        const existingReviewer = reviewers.get(reviewer.login);
        // We might see the same reviewer requested as a code owner and as a member of a team (with asCodeOwner = false)
        if (!existingReviewer || (!existingReviewer.asCodeOwner && asCodeOwner)) {
            reviewers.set(reviewer.login, { login: reviewer.login, asCodeOwner });
        }
        this.collectUser(reviewer);
    }
    async onProcessingComplete(ctx) {
        const res = [];
        for (const record of this.convertBranches()) {
            res.push(record);
        }
        for (const record of this.convertLabels()) {
            res.push(record);
        }
        for (const record of this.convertUsers()) {
            res.push(record);
        }
        for (const record of this.fileCollector.convertFiles()) {
            res.push(record);
        }
        for (const record of this.convertPRFileAssociations()) {
            res.push(record);
        }
        return res;
    }
    collectBranch(branchName, branchRepo) {
        if (!branchName || !branchRepo?.name || !branchRepo?.owner?.login) {
            return null;
        }
        const key = branchKey(branchName, branchRepo, this.streamName.source);
        const keyStr = branchKeyToString(key);
        if (!this.collectedBranches.has(keyStr)) {
            this.collectedBranches.set(keyStr, key);
        }
        return key;
    }
    convertBranches() {
        return Array.from(this.collectedBranches.values()).map((branch) => ({
            model: 'vcs_Branch',
            record: branch,
        }));
    }
    convertLabels() {
        return Array.from(this.collectedLabels.values()).map((label) => ({
            model: 'vcs_Label',
            record: {
                name: label,
            },
        }));
    }
    convertPRFileAssociations() {
        // Only process PR file associations if we're fetching PR files from the source
        if (!this.fetchingPrFiles) {
            return [];
        }
        return [
            ...Array.from(this.prFileAssoc.keys()).map((prKeyStr) => ({
                model: 'vcs_PullRequestFile__Deletion',
                record: {
                    flushRequired: false,
                    where: {
                        pullRequest: this.prKeyMap.get(prKeyStr),
                    },
                },
            })),
            types_1.FLUSH,
            ...Array.from(this.prFileAssoc.values()).flat(),
        ];
    }
}
exports.FarosPullRequests = FarosPullRequests;
function branchKey(branchName, branchRepo, source) {
    return {
        uid: branchName,
        name: branchName,
        repository: common_1.GitHubCommon.repoKey(branchRepo.owner.login, branchRepo.name, source),
    };
}
function branchKeyToString(branchKey) {
    return `${branchKey.repository.organization.uid}/${branchKey.repository.name}/${branchKey.name}`;
}
function getReviewState(state) {
    const reviewStates = [
        'approved',
        'commented',
        'changes_requested',
        'dismissed',
    ];
    return reviewStates.includes((0, lodash_1.toLower)(state))
        ? { category: (0, lodash_1.upperFirst)((0, lodash_1.camelCase)(state)), detail: state }
        : { category: 'Custom', detail: state };
}
//# sourceMappingURL=faros_pull_requests.js.map