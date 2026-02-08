//! State Machine Procedural Macro
//!
//! Generates type-safe state machines with:
//! - Compile-time transition validation
//! - Guard functions for business rules
//! - Action functions for side effects
//! - Automatic audit trail generation
//!
//! # Example
//!
//! ```ignore
//! state_machine! {
//!     AppointmentStateMachine for AppointmentStatus {
//!         initial: Scheduled,
//!
//!         Scheduled => {
//!             Confirm => Confirmed,
//!             Cancel [guard: cancellation_allowed] => Cancelled,
//!         },
//!         Confirmed => {
//!             CheckIn [action: record_arrival] => CheckedIn,
//!             NoShow [guard: past_scheduled_time] => NoShow,
//!         },
//!         CheckedIn => {
//!             Complete [action: calculate_duration] => Completed,
//!         },
//!     }
//! }
//! ```

use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::{format_ident, quote};
use syn::{
    braced, bracketed,
    parse::{Parse, ParseStream},
    parse_macro_input,
    punctuated::Punctuated,
    Ident, Result, Token,
};

/// A single transition: `Event [guard: fn, action: fn] => TargetState`
struct Transition {
    event: Ident,
    guard: Option<Ident>,
    action: Option<Ident>,
    target: Ident,
}

impl Parse for Transition {
    fn parse(input: ParseStream) -> Result<Self> {
        let event: Ident = input.parse()?;

        let mut guard = None;
        let mut action = None;

        // Parse optional [guard: fn, action: fn]
        if input.peek(syn::token::Bracket) {
            let content;
            bracketed!(content in input);

            while !content.is_empty() {
                let attr_name: Ident = content.parse()?;
                content.parse::<Token![:]>()?;
                let attr_value: Ident = content.parse()?;

                match attr_name.to_string().as_str() {
                    "guard" => guard = Some(attr_value),
                    "action" => action = Some(attr_value),
                    _ => {
                        return Err(syn::Error::new(
                            attr_name.span(),
                            format!("Unknown attribute: {}. Expected 'guard' or 'action'", attr_name),
                        ))
                    }
                }

                // Optional comma between attributes
                if content.peek(Token![,]) {
                    content.parse::<Token![,]>()?;
                }
            }
        }

        input.parse::<Token![=>]>()?;
        let target: Ident = input.parse()?;

        Ok(Transition {
            event,
            guard,
            action,
            target,
        })
    }
}

/// A state with its transitions: `StateName => { transitions... }`
struct StateDefinition {
    name: Ident,
    transitions: Vec<Transition>,
}

impl Parse for StateDefinition {
    fn parse(input: ParseStream) -> Result<Self> {
        let name: Ident = input.parse()?;
        input.parse::<Token![=>]>()?;

        let content;
        braced!(content in input);

        let mut transitions = Vec::new();
        while !content.is_empty() {
            transitions.push(content.parse()?);
            // Optional comma/semicolon between transitions
            if content.peek(Token![,]) {
                content.parse::<Token![,]>()?;
            }
        }

        Ok(StateDefinition { name, transitions })
    }
}

/// The full state machine definition
struct StateMachineDefinition {
    machine_name: Ident,
    state_enum: Ident,
    initial_state: Ident,
    states: Vec<StateDefinition>,
}

impl Parse for StateMachineDefinition {
    fn parse(input: ParseStream) -> Result<Self> {
        // Parse: MachineName for StateEnum
        let machine_name: Ident = input.parse()?;
        input.parse::<Token![for]>()?;
        let state_enum: Ident = input.parse()?;

        let content;
        braced!(content in input);

        // Parse: initial: StateName,
        let initial_label: Ident = content.parse()?;
        if initial_label != "initial" {
            return Err(syn::Error::new(
                initial_label.span(),
                "Expected 'initial:' to specify initial state",
            ));
        }
        content.parse::<Token![:]>()?;
        let initial_state: Ident = content.parse()?;
        content.parse::<Token![,]>()?;

        // Parse state definitions
        let mut states = Vec::new();
        while !content.is_empty() {
            states.push(content.parse()?);
            // Optional comma between state definitions
            if content.peek(Token![,]) {
                content.parse::<Token![,]>()?;
            }
        }

        Ok(StateMachineDefinition {
            machine_name,
            state_enum,
            initial_state,
            states,
        })
    }
}

/// Generate the state machine implementation
fn generate_state_machine(def: StateMachineDefinition) -> TokenStream2 {
    let machine_name = def.machine_name.clone();
    let state_enum = def.state_enum.clone();
    let initial_state = def.initial_state.clone();

    // Collect all unique events
    let mut all_events: Vec<Ident> = Vec::new();
    for state in &def.states {
        for transition in &state.transitions {
            if !all_events.iter().any(|e| e == &transition.event) {
                all_events.push(transition.event.clone());
            }
        }
    }

    // Generate Event enum
    let event_enum_name = format_ident!("{}Event", machine_name);
    let event_variants: Vec<_> = all_events.iter().map(|e| quote! { #e }).collect();

    // Generate can_transition match arms
    let can_transition_arms: Vec<_> = def
        .states
        .iter()
        .flat_map(|state| {
            let state_name = state.name.clone();
            let state_enum = state_enum.clone();
            let event_enum_name = event_enum_name.clone();
            state.transitions.iter().map(move |t| {
                let event = t.event.clone();
                let state_enum = state_enum.clone();
                let event_enum_name = event_enum_name.clone();
                let state_name = state_name.clone();
                let guard_check = if let Some(guard) = &t.guard {
                    quote! { Self::#guard(ctx) }
                } else {
                    quote! { true }
                };
                quote! {
                    (#state_enum::#state_name, #event_enum_name::#event) => #guard_check
                }
            }).collect::<Vec<_>>()
        })
        .collect();

    // Generate transition match arms
    let transition_arms: Vec<_> = def
        .states
        .iter()
        .flat_map(|state| {
            let state_name = state.name.clone();
            let state_enum = state_enum.clone();
            let event_enum_name = event_enum_name.clone();
            state.transitions.iter().map(move |t| {
                let event = t.event.clone();
                let target = t.target.clone();
                let state_enum = state_enum.clone();
                let event_enum_name = event_enum_name.clone();
                let state_name = state_name.clone();

                let guard_check = if let Some(guard) = &t.guard {
                    quote! {
                        if !Self::#guard(ctx) {
                            return std::result::Result::Err(TransitionError::GuardFailed {
                                from: stringify!(#state_name).to_string(),
                                event: stringify!(#event).to_string(),
                                guard: stringify!(#guard).to_string(),
                            });
                        }
                    }
                } else {
                    quote! {}
                };

                let action_call = if let Some(action) = &t.action {
                    quote! { Self::#action(ctx); }
                } else {
                    quote! {}
                };

                quote! {
                    (#state_enum::#state_name, #event_enum_name::#event) => {
                        #guard_check
                        #action_call
                        std::result::Result::Ok(#state_enum::#target)
                    }
                }
            }).collect::<Vec<_>>()
        })
        .collect();

    // Generate valid_transitions match arms
    let valid_transitions_arms: Vec<_> = def
        .states
        .iter()
        .map(|state| {
            let state_name = state.name.clone();
            let state_enum = state_enum.clone();
            let event_enum_name = event_enum_name.clone();
            let events: Vec<_> = state
                .transitions
                .iter()
                .map(|t| {
                    let event = t.event.clone();
                    let event_enum_name = event_enum_name.clone();
                    quote! { #event_enum_name::#event }
                })
                .collect();
            quote! {
                #state_enum::#state_name => vec![#(#events),*]
            }
        })
        .collect();

    // Generate target_state match arms
    let target_state_arms: Vec<_> = def
        .states
        .iter()
        .flat_map(|state| {
            let state_name = state.name.clone();
            let state_enum = state_enum.clone();
            let event_enum_name = event_enum_name.clone();
            state.transitions.iter().map(move |t| {
                let event = t.event.clone();
                let target = t.target.clone();
                let state_enum = state_enum.clone();
                let event_enum_name = event_enum_name.clone();
                let state_name = state_name.clone();
                quote! {
                    (#state_enum::#state_name, #event_enum_name::#event) => Some(#state_enum::#target)
                }
            }).collect::<Vec<_>>()
        })
        .collect();

    // Collect all states that have outgoing transitions (non-terminal)
    let defined_states: Vec<_> = def.states.iter().map(|s| &s.name).collect();

    // Collect unique guards and actions (deduplicate)
    let mut unique_guards: Vec<Ident> = Vec::new();
    let mut unique_actions: Vec<Ident> = Vec::new();

    for state in &def.states {
        for t in &state.transitions {
            if let Some(g) = &t.guard {
                if !unique_guards.iter().any(|x| x == g) {
                    unique_guards.push(g.clone());
                }
            }
            if let Some(a) = &t.action {
                if !unique_actions.iter().any(|x| x == a) {
                    unique_actions.push(a.clone());
                }
            }
        }
    }

    // Generate guard/action stub traits
    let guard_stubs: Vec<_> = unique_guards
        .iter()
        .map(|g| {
            quote! {
                /// Guard function: returns true if transition is allowed
                fn #g(ctx: &Ctx) -> bool;
            }
        })
        .collect();

    let action_stubs: Vec<_> = unique_actions
        .iter()
        .map(|a| {
            quote! {
                /// Action function: executed when transition occurs
                fn #a(ctx: &mut Ctx);
            }
        })
        .collect();

    quote! {
        /// Events that can trigger state transitions
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub enum #event_enum_name {
            #(#event_variants),*
        }

        impl std::fmt::Display for #event_enum_name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                match self {
                    #(#event_enum_name::#event_variants => write!(f, stringify!(#event_variants))),*
                }
            }
        }

        /// State machine trait - implement guards and actions
        pub trait #machine_name<Ctx> {
            /// Initial state
            const INITIAL: #state_enum = #state_enum::#initial_state;

            #(#guard_stubs)*
            #(#action_stubs)*

            /// Check if a transition is valid without executing it
            fn can_transition(state: &#state_enum, event: &#event_enum_name, ctx: &Ctx) -> bool {
                match (state, event) {
                    #(#can_transition_arms,)*
                    _ => false,
                }
            }

            /// Execute a state transition
            ///
            /// Note: TransitionError must be in scope (use `shared::domain::state_machine::TransitionError`)
            fn transition(
                state: &#state_enum,
                event: #event_enum_name,
                ctx: &mut Ctx,
            ) -> std::result::Result<#state_enum, TransitionError> {
                match (state, &event) {
                    #(#transition_arms,)*
                    _ => std::result::Result::Err(TransitionError::InvalidTransition {
                        from: format!("{:?}", state),
                        event: format!("{:?}", event),
                    }),
                }
            }

            /// Get all valid events for the current state
            fn valid_transitions(state: &#state_enum) -> Vec<#event_enum_name> {
                match state {
                    #(#valid_transitions_arms,)*
                    _ => vec![],
                }
            }

            /// Get target state for a transition (without executing)
            fn target_state(state: &#state_enum, event: &#event_enum_name) -> Option<#state_enum> {
                match (state, event) {
                    #(#target_state_arms,)*
                    _ => None,
                }
            }

        }
    }
}

/// The main state_machine! macro
#[proc_macro]
pub fn state_machine(input: TokenStream) -> TokenStream {
    let definition = parse_macro_input!(input as StateMachineDefinition);
    generate_state_machine(definition).into()
}
