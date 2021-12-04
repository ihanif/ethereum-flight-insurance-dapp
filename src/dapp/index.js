import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: result.flight + " " + result.timestamp,
          },
        ]);
      });
    });

    DOM.elid("registerNewAirline").addEventListener("click", () => {
      let airlineName = DOM.elid("newAirlineName").value;
      let airlineAddress = DOM.elid("newAirlineAddress").value;
      contract.registerAirline(airlineAddress, airlineName, (error, result) => {
        console.error(error);
        display("Airline registeration", "", [
          {
            label: "Airline registered status",
            error: error,
            value: result,
          },
        ]);
        DOM.elid("newAirlineName").value = "";
        DOM.elid("newAirlineAddress").value = "";
      });
    });

    DOM.elid("fundAirline").addEventListener("click", () => {
      const fundedAirlineAddress = DOM.elid("fundedAirlineAddress").value;
      const fundingAmount = DOM.elid("fundingAmount").value;
      console.log("Funding airline with amount: ", fundingAmount);
      contract.fundAirline(
        fundedAirlineAddress,
        fundingAmount,
        (error, result) => {
          display("Airline funding", "", [
            {
              label: "Airline funding status",
              error: error,
              value: result,
            },
          ]);
          DOM.elid("fundedAirlineAddress").value = "";
          DOM.elid("fundingAmount").value = "";
        }
      );
    });

    DOM.elid("registerFlight").addEventListener("click", () => {
      const flightNumber = DOM.elid("registerFlightNumber").value;
      const departureTime = DOM.elid("registerFlightDepartTime").value;
      const departureLocation = DOM.elid("registerFlightDepartLocation").value;
      const arrivalLocation = DOM.elid("registerFlightArrivalLocation").value;
      contract.registerFlight(
        flightNumber,
        departureTime,
        departureLocation,
        arrivalLocation,
        (error, result) => {
          display("Flight registeration", "", [
            {
              label: "Flight registered status",
              error: error,
              value: result,
            },
          ]);

          DOM.elid("registerFlightNumber").value = "";
          DOM.elid("registerFlightDepartTime").value = "";
          DOM.elid("registerFlightDepartLocation").value = "";
          DOM.elid("registerFlightArrivalLocation").value = "";
        }
      );
    });

    DOM.elid("buyInsurance").addEventListener("click", () => {
      let flightNumber = DOM.elid("insuredFlightNumber").value;
      let insuredAmount = DOM.elid("insuranceAmount").value;
      contract.buyInsurance(flightNumber, insuredAmount, (error, result) => {
        display("Customer bought insurance: ", "", [
          { label: "Insurance transactions: ", error: error, value: result },
        ]);
        DOM.elid("insuredFlightNumber").value = "";
        DOM.elid("insuranceAmount").value = "";
      });
    });

    DOM.elid("claimInsurance").addEventListener("click", () => {
      contract.claimInsurance((error, result) => {
        display("Customer claimed insurance: ", "", [
          { label: "Claim paid: ", error: error, value: result + " ETH" },
        ]);
      });
    });
  });
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
