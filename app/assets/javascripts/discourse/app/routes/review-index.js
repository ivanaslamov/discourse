import DiscourseRoute from "discourse/routes/discourse";
import { isPresent } from "@ember/utils";

export default DiscourseRoute.extend({
  model(params) {
    if (params.sort_order === null) {
      if (params.status === "reviewed" || params.status === "all") {
        params.sort_order = "created_at";
      } else {
        params.sort_order = "score";
      }
    }

    return this.store.findAll("reviewable", params);
  },

  setupController(controller, model) {
    let meta = model.resultSetMeta;

    // "fast track" to update the current user's reviewable count before the message bus finds out.
    if (meta.reviewable_count !== undefined) {
      this.currentUser.set("reviewable_count", meta.reviewable_count);
    }

    controller.setProperties({
      reviewables: model,
      type: meta.type,
      filterType: meta.type,
      filterStatus: meta.status,
      filterTopic: meta.topic_id,
      filterCategoryId: meta.category_id,
      filterPriority: meta.priority,
      reviewableTypes: meta.reviewable_types,
      filterUsername: meta.username,
      filterFromDate: isPresent(meta.from_date) ? moment(meta.from_date) : null,
      filterToDate: isPresent(meta.to_date) ? moment(meta.to_date) : null,
      filterSortOrder: meta.sort_order,
      sort_order: meta.sort_order,
      additionalFilters: meta.additional_filters || {},
    });
  },

  activate() {
    this.messageBus.subscribe("/reviewable_claimed", (data) => {
      const reviewables = this.controller.reviewables;
      if (reviewables) {
        const user = data.user
          ? this.store.createRecord("user", data.user)
          : null;
        reviewables.forEach((reviewable) => {
          if (data.topic_id === reviewable.topic.id) {
            reviewable.set("claimed_by", user);
          }
        });
      }
    });
  },

  deactivate() {
    this.messageBus.unsubscribe("/reviewable_claimed");
  },

  actions: {
    refreshRoute() {
      this.refresh();
    },
  },
});
