"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarosUsers = void 0;
const common_1 = require("./common");
class FarosUsers extends common_1.GitHubConverter {
    constructor() {
        super(...arguments);
        this.destinationModels = [
            'vcs_Membership',
            'vcs_User',
            'vcs_UserEmail',
        ];
    }
    async convert(record, ctx) {
        const user = record.record.data;
        this.collectUser(user);
        return [];
    }
    async onProcessingComplete(ctx) {
        return this.convertUsers();
    }
}
exports.FarosUsers = FarosUsers;
//# sourceMappingURL=faros_users.js.map