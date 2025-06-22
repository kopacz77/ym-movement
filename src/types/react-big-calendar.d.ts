import { Locale } from "date-fns";

declare module "react-big-calendar" {
  export interface LocalizerConfig {
    format: (date: Date, format: string, options?: object) => string;
    parse: (dateString: string, format: string, options?: object) => Date;
    firstDayOfWeek: (locale: Locale) => number;
    formats: { 
      date: string; 
      time: string; 
      datetime: string; 
      dateTime: string; 
    };
  }

  export interface Resource {
    id: string | number;
    title: string;
    [key: string]: unknown;
  }

  export interface FormatObject {
    dayFormat?: string;
    weekdayFormat?: string;
    timeGutterFormat?: string;
    monthHeaderFormat?: string;
    dayHeaderFormat?: string;
    dayRangeHeaderFormat?: (range: { start: Date; end: Date }) => string;
    agendaDateFormat?: string;
    agendaTimeFormat?: string;
    agendaTimeRangeFormat?: (range: { start: Date; end: Date }) => string;
    eventTimeRangeFormat?: (range: { start: Date; end: Date }) => string;
    selectRangeFormat?: (range: { start: Date; end: Date }) => string;
  }

  export interface ComponentsConfig {
    event?: React.ComponentType<any>;
    eventWrapper?: React.ComponentType<any>;
    dayWrapper?: React.ComponentType<any>;
    dateCellWrapper?: React.ComponentType<any>;
    toolbar?: React.ComponentType<any>;
    agenda?: {
      date?: React.ComponentType<any>;
      time?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    day?: {
      header?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    week?: {
      header?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    month?: {
      header?: React.ComponentType<any>;
      dateHeader?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
  }

  export interface MessagesConfig {
    allDay?: string;
    previous?: string;
    next?: string;
    today?: string;
    month?: string;
    week?: string;
    day?: string;
    agenda?: string;
    date?: string;
    time?: string;
    event?: string;
    noEventsInRange?: string;
    showMore?: (total: number) => string;
  }

  export interface CalendarProps {
    localizer: DateLocalizer;
    events: Array<Event>;
    startAccessor?: string | ((event: Event) => Date);
    endAccessor?: string | ((event: Event) => Date);
    titleAccessor?: string | ((event: Event) => string);
    allDayAccessor?: string | ((event: Event) => boolean);
    tooltipAccessor?: string | ((event: Event) => string);
    resourceAccessor?: string | ((event: Event) => string | number);
    resources?: Array<Resource>;
    resourceIdAccessor?: string | ((resource: Resource) => string | number);
    resourceTitleAccessor?: string | ((resource: Resource) => string);
    defaultView?: string;
    view?: string;
    views?: Array<string> | { [view: string]: boolean };
    date?: Date;
    defaultDate?: Date;
    min?: Date;
    max?: Date;
    scrollToTime?: Date;
    culture?: string;
    formats?: FormatObject;
    components?: ComponentsConfig;
    messages?: MessagesConfig;
    timeslots?: number;
    rtl?: boolean;
    step?: number;
    length?: number;
    selectable?: boolean | "ignoreEvents";
    longPressThreshold?: number;
    onSelectSlot?: (slotInfo: SelectSlotInfo) => void;
    onSelectEvent?: (event: Event, e: React.SyntheticEvent) => void;
    onDoubleClickEvent?: (event: Event, e: React.SyntheticEvent) => void;
    onKeyPressEvent?: (event: Event, e: React.SyntheticEvent) => void;
    onSelecting?: (range: { start: Date; end: Date }) => boolean | undefined | null;
    selected?: Event;
    popup?: boolean;
    popupOffset?: number | { x: number; y: number };
    onNavigate?: (newDate: Date, view: string, action: string) => void;
    onView?: (view: string) => void;
    eventPropGetter?: (event: Event, start: Date, end: Date, isSelected: boolean) => object;
    slotPropGetter?: (date: Date) => object;
    dayPropGetter?: (date: Date) => object;
    showMultiDayTimes?: boolean;
    getDrilldownView?: (targetDate: Date, currentViewName: string, configuredViewNames: string[]) => string | null;
    onDrillDown?: (date: Date, view: string) => void;
    className?: string;
    elementProps?: React.HTMLAttributes<HTMLElement>;
    style?: React.CSSProperties;
    dayLayoutAlgorithm?: "overlap" | "no-overlap" | ((events: Array<Event>, minimumStartDifference: number) => Array<Array<Event>>);
  }

  export interface SelectSlotInfo {
    start: Date;
    end: Date;
    slots: Date[] | string[];
    action: "select" | "click" | "doubleClick";
  }

  export interface Event {
    id?: string | number;
    title?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: string | number;
    [key: string]: unknown;
  }

  export const Calendar: React.ComponentType<CalendarProps>;
  export interface DateLocalizer {
    format: (value: Date, format: string, culture?: string) => string;
    formats: FormatObject;
    startOfWeek: (culture: string) => number;
  }
  export const momentLocalizer: (moment: any) => DateLocalizer;
  export const dateFnsLocalizer: (config: LocalizerConfig) => DateLocalizer;
  export const Views: {
    MONTH: string;
    WEEK: string;
    WORK_WEEK: string;
    DAY: string;
    AGENDA: string;
  };
}