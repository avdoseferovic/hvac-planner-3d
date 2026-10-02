import { addClonedStory } from "../stories";
import { nextId, useStore, useT } from "../store";
import { DEFAULT_STORY_ID } from "../types";

const eyeIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.7" />
  </svg>
);

export function StoryBar() {
  const t = useT();
  const stories = useStore((state) => state.model.stories);
  const activeStoryId = useStore((state) => state.activeStoryId);
  const visibleStoryIds = useStore((state) => state.visibleStoryIds);
  const commit = useStore((state) => state.commit);
  const setActiveStoryId = useStore((state) => state.setActiveStoryId);
  const setStoryVisible = useStore((state) => state.setStoryVisible);

  const addStory = () => {
    const id = nextId("story");
    const index = stories.length + 1;
    commit((model) =>
      addClonedStory(model, activeStoryId, {
        id,
        name: `${t("story.upper")} ${Math.max(1, index - 1)}`,
      }),
    );
    setActiveStoryId(id);
    setStoryVisible(id, true);
  };

  return (
    <div className="story-bar" aria-label={t("story.active")}>
      <span className="story-bar-label">{t("story.active")}</span>
      <div className="story-tabs">
        {stories.map((story) => {
          const visible = visibleStoryIds.includes(story.id);
          const label =
            story.id === DEFAULT_STORY_ID ? t("story.ground") : story.name;
          return (
            <div
              className={`story-tab ${story.id === activeStoryId ? "active" : ""}`}
              key={story.id}
            >
              <button
                className="story-select"
                onClick={() => setActiveStoryId(story.id)}
                aria-pressed={story.id === activeStoryId}
                data-testid={`story-select-${story.id}`}
              >
                {label}
              </button>
              <button
                className={`story-eye ${visible ? "visible" : ""}`}
                onClick={() => setStoryVisible(story.id, !visible)}
                aria-pressed={visible}
                aria-label={`${t("story.visibility")}: ${label}`}
                title={`${t("story.visibility")}: ${label}`}
                data-testid={`story-visible-${story.id}`}
              >
                {eyeIcon}
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="story-add"
        onClick={addStory}
        title={t("story.add")}
        aria-label={t("story.add")}
        data-testid="story-add"
      >
        +
      </button>
    </div>
  );
}
