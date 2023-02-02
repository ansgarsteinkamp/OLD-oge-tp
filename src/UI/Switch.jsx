import { Switch } from "@headlessui/react";

function classNames(...classes) {
   return classes.filter(Boolean).join(" ");
}

export default function MySwitch({ allocation, setAllocation }) {
   return (
      <Switch
         checked={allocation}
         onChange={setAllocation}
         className={classNames(
            "bg-stone-600 relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
         )}
      >
         <span className="sr-only">Use setting</span>
         <span
            aria-hidden="true"
            className={classNames(
               allocation ? "translate-x-3" : "translate-x-0",
               "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
         />
      </Switch>
   );
}
