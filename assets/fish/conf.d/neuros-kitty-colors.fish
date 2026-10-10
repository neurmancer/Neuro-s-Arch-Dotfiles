# Only command highlighting in Kitty follows NSD; output colors stay unchanged.
function __neuros_kitty_command_color --on-event fish_prompt
    set -q KITTY_WINDOW_ID; or return
    set -l config_dir "$HOME/.config"
    if set -q XDG_CONFIG_HOME
        set config_dir "$XDG_CONFIG_HOME"
    end
    set -l kitty_dir "$config_dir/kitty"
    if set -q KITTY_CONFIG_DIRECTORY
        set kitty_dir "$KITTY_CONFIG_DIRECTORY"
    end
    set -l style
    if test -r "$kitty_dir/.kitty-style"
        read style < "$kitty_dir/.kitty-style"
    end
    if test "$style" = nsd
        if not set -q __neuros_command_color_active
            set -g __neuros_previous_command_color $fish_color_command
            set -g __neuros_command_color_active 1
        end
        set -g fish_color_command 00EB74
    else if set -q __neuros_command_color_active
        if test (count $__neuros_previous_command_color) -gt 0
            set -g fish_color_command $__neuros_previous_command_color
        else
            set -e -g fish_color_command
        end
        set -e -g __neuros_previous_command_color
        set -e -g __neuros_command_color_active
    end
end
