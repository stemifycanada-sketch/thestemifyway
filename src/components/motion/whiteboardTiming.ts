// Continue the portal immediately, with no still-frame or copy hold.
export const WHITEBOARD_SCROLL_UNIT = 7
export const WHITEBOARD_FILM_FROM = 0
export const WHITEBOARD_FILM_TO = .45
export const WHITEBOARD_RESOURCES = .825

export const RESOURCE_TRAVEL_FROM = .84
export const RESOURCE_TRAVEL_TO = .935

// The pin releases as the rows exit; the final viewport scroll reveals the next chapter.
export const RESOURCE_EXIT_FROM = .954
export const WHITEBOARD_END = RESOURCE_EXIT_FROM + 1 / WHITEBOARD_SCROLL_UNIT
