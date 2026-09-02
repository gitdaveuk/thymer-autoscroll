class Plugin extends AppPlugin {
    onLoad() {
        // --- CONFIGURATION ---
        // Trigger jump when cursor is at 85% of screen height
        const TRIGGER_FRACTION = 0.85; 
        // Jump so cursor lands at 25% of screen height
        const TARGET_FRACTION  = 0.25; 
        
        const DEBOUNCE_MS      = 40;
        const SMOOTH_MS        = 4; // 0 = Instant jump

        let debounceTimer = null;
        let textarea      = null;
        let boundHandler  = null;

        // --- Core Logic ---
        const handleRecenter = (scroller, cursor) => {
            if (!scroller || !cursor) return;

            const scrollerRect = scroller.getBoundingClientRect();
            const cursorRect   = cursor.getBoundingClientRect();

            // Calculate current relative position (0.0 to 1.0)
            const currentRelativeY = (cursorRect.top - scrollerRect.top) / scrollerRect.height;

            // Only jump if we have passed the trigger threshold (bottom of screen)
            if (currentRelativeY > TRIGGER_FRACTION) {
                const currentScrollTop = scroller.scrollTop;
                
                // Where we want the cursor to be relative to the scroller top
                const desiredPixelY = scrollerRect.height * TARGET_FRACTION;
                
                // The distance we need to move the text
                const delta = (cursorRect.top - scrollerRect.top) - desiredPixelY;

                scroller.scrollTop = currentScrollTop + delta;
                console.log("Org-mode Recenter: Jumped");
            }
        };

        // --- Scroller/Cursor Discovery ---
        const CURSOR_SELECTORS = ['.caret-blink', '.cursor', '.editor-cursor'];

        function findContext() {
            const root = document.querySelector('.panel.has-focus') || document;
            for (const sel of CURSOR_SELECTORS) {
                const cursor = root.querySelector(sel);
                if (cursor && cursor.getBoundingClientRect().height > 0) {
                    let p = cursor.parentElement;
                    while (p) {
                        if (p.classList.contains('panel-scroller-y')) {
                            return { cursor, scroller: p };
                        }
                        p = p.parentElement;
                    }
                }
            }
            return null;
        }

        const onInput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                requestAnimationFrame(() => {
                    const ctx = findContext();
                    if (ctx) handleRecenter(ctx.scroller, ctx.cursor);
                });
            }, DEBOUNCE_MS);
        };

        // --- VirtualInput Attachment ---
        const attach = () => {
            const wrapper = document.getElementById('virtualinput-wrapper');
            const sr = wrapper?.shadowRoot;
            if (!sr) return false;

            const ta = sr.getElementById('virtualinput');
            if (!ta || ta === textarea) return !!textarea;

            if (textarea && boundHandler) {
                textarea.removeEventListener('keydown', boundHandler, true);
                textarea.removeEventListener('input', boundHandler, true);
            }

            textarea = ta;
            boundHandler = onInput;
            textarea.addEventListener('keydown', boundHandler, true);
            textarea.addEventListener('input', boundHandler, true);
            return true;
        };

        // Polling to catch the editor when it opens
        if (!attach()) {
            this._poll = setInterval(() => {
                if (attach()) clearInterval(this._poll);
            }, 500);
        }
        
        console.log("Autoscroll: Ready");
    }

    onUnload() {
        clearInterval(this._poll);
    }
}
