"""Every word on a service's page that isn't already a field of its own, and the page's sections.

The wording is kept per service in Service.page_text, which only holds what has been changed: an empty box in the admin
means the standard wording below. Adding a wording here needs no migration. The frontend has the same standard wording
in app/components/services/detail/types.ts, so that the page still reads properly before an API sends any of this.
"""

# In the wording, {part} becomes the name of the part, {part_lower} the same in small letters, and {title} the service's title.
# Put | in a heading before the words that should be in blue. Without one, the last word is.

# (key, label in the admin, standard wording)
PAGE_TEXT = (
    ("Opening", (
        ("part_name", "Name of the part", "The name on the board, like Neural engine"),
        ("hero_title", "Big title", "The service's title"),
        ("breadcrumb", "Breadcrumb link", "Services"),
        ("hero_kicker", "Small line above the title", "{part} // Our service"),
        ("cta_primary", "Main button", "Start this project"),
        ("cta_secondary", "Second button", "See what we do"),
        ("fact_capabilities", "Count label: capabilities", "Things we do"),
        ("fact_features", "Count label: features", "Functions"),
        ("fact_tools", "Count label: tools", "Tools"),
        ("fact_projects", "Count label: projects", "Live projects"),
        ("diving", "Line shown while flying into the part", "Going inside // {part}"),
        ("hud_target", "Readout: target", "Target"),
        ("hud_field", "Readout: field of view", "Field of view"),
    )),
    ("What it does", (
        ("overview_kicker", "Small line", "What it does // {part}"),
        ("overview_title", "Heading", "What it | does."),
        ("ideal_for_label", "Label above 'Right for you if' lines", "Right for you if"),
    )),
    ("What we do (the silicon die)", (
        ("die_kicker", "Small line", "What we do // Inside the {part_lower}"),
        ("die_title", "Heading", "What we | do."),
        ("die_kicker_benefits", "Small line, when the service has no capabilities yet", "What you get // Inside the {part_lower}"),
        ("die_title_benefits", "Heading, when the service has no capabilities yet", "What you | get."),
        ("skip", "Skip button", "Skip"),
    )),
    ("Second description", (
        ("closer_kicker", "Small line", "In depth // {part}"),
        ("closer_title", "Heading, when the Second Description has none", "A closer | look."),
    )),
    ("What goes in, what you get", (
        ("pins_kicker", "Small line", "In and out // {part}"),
        ("pins_title", "Heading", "What goes in. | What you get."),
        ("pins_kicker_single", "Small line, when only one of the two lists has anything", "What's included // {part}"),
        ("pins_title_single", "Heading, when only one of the two lists has anything", "What's | included."),
        ("pins_in", "Label on the features list", "What goes in"),
        ("pins_out", "Label on the benefits list", "What you get"),
        ("show_all", "Button on phones ({count} is the number)", "Show all {count}"),
    )),
    ("In real use", (
        ("use_kicker", "Small line", "In real use // Live work and pictures"),
        ("use_title", "Heading", "In real | use."),
        ("live_tag", "Tag on project pictures", "Live work"),
    )),
    ("Tools", (
        ("tools_kicker", "Small line", "Tools we use // Plugged in"),
        ("tools_title", "Heading", "Tools we | use."),
    )),
    ("Questions", (
        ("faq_kicker", "Small line", "Questions // Before you start"),
        ("faq_title", "Heading", "Good | questions."),
        ("faq_window", "Title on the window", "questions.log"),
    )),
    ("Connected parts", (
        ("connected_kicker", "Small line", "Connected parts // On the same board"),
        ("connected_title", "Heading", "It connects | to these."),
        ("board_link", "Button", "See the whole board"),
    )),
    ("Enquiry form", (
        ("form_kicker", "Small line", "Work with us"),
        ("form_title", "Heading", "Have a project in mind?"),
        ("form_text", "Text", "Share your details and we'll reach out to talk through how we can build it."),
    )),
)

# Each can be switched off for a service. A section with nothing to show stays hidden anyway.
PAGE_SECTIONS = (
    ("facts", "The counts under the opening"),
    ("overview", "What it does"),
    ("what_we_do", "What we do (the silicon die)"),
    ("closer", "Second description"),
    ("in_and_out", "What goes in, what you get"),
    ("in_use", "In real use"),
    ("tools", "Tools"),
    ("questions", "Questions"),
    ("connected", "Connected parts"),
    ("form", "Enquiry form"),
)

TEXT_KEYS = tuple(key for _, items in PAGE_TEXT for key, _, _ in items)
