import type {
  ActionFunction,
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
  RouteComponent,
} from "remix";
import {
  Form,
  json,
  Link,
  redirect,
  usePendingFormSubmit,
  useRouteData,
} from "remix";
import { format, parseISO } from "date-fns";

import { formatMoney } from "~/lib/format-money";
import { storefront } from "~/lib/storefront.server";
import { getSdk, ProductByHandleQuery, ProductsQuery } from "~/graphql";

interface RouteData {
  product: ProductByHandleQuery["productByHandle"];
  relatedProducts: ProductsQuery["products"]["edges"];
}

const loader: LoaderFunction = async ({ params }) => {
  let sdk = getSdk(storefront);
  let [{ productByHandle }, { products }] = await Promise.all([
    sdk.ProductByHandle({ handle: params.handle }),
    sdk.Products(),
  ]);

  const relatedProducts = products.edges
    .filter((item) => item.node.handle !== params.handle)
    .slice(0, 4);

  return json(
    { product: productByHandle, relatedProducts },
    {
      headers: {
        "Cache-Control":
          "max-age=60, s-maxage=3600, stale-while-revalidate=604800",
      },
    }
  );
};

let action: ActionFunction = async ({ request }) => {
  let body = await request.text();
  let formData = new URLSearchParams(body);
  let variantId = formData.get("variantId");

  if (!variantId) {
    return redirect(request.url);
  }

  let sdk = getSdk(storefront);

  let res = await sdk.CreateCheckout({ variantId });

  if (!res.checkoutCreate?.checkout) {
    return redirect(request.url);
  }

  return redirect(res.checkoutCreate.checkout.webUrl);
};

let headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  };
};

const meta: MetaFunction = ({ data }: { data: RouteData }) => {
  if (!data.product) {
    return {
      title: "Product not found",
    };
  }

  return { title: `${data.product.title}` };
};

const ProductPage: RouteComponent = () => {
  let { product, relatedProducts } = useRouteData<RouteData>();
  let pendingForm = usePendingFormSubmit();

  if (!product) {
    return <div>Product not found</div>;
  }

  let variantId = product.variants.edges[0].node.id;
  let image = product.images.edges[0].node;

  return (
    <main className="px-4 mx-auto max-w-7xl pt-14 sm:pt-24 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-7 lg:gap-x-8 xl:gap-x-16">
        <div className="lg:col-span-4">
          <div className="overflow-hidden bg-gray-100 rounded-lg aspect-w-4 aspect-h-3">
            <img
              src={image.transformedSrc}
              className="object-cover object-center"
              alt={image.altText ?? ""}
            />
          </div>
        </div>
        <div className="max-w-2xl mx-auto mt-14 sm:mt-16 lg:max-w-none lg:mt-0 lg:col-span-3">
          <div className="flex flex-col-reverse">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                {product.title}
              </h1>
              <h2 id="information-heading" className="sr-only">
                Product information
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {product.tags.join(", ")} · Updated{" "}
                <time dateTime={product.updatedAt}>
                  {format(parseISO(product.updatedAt), "dd MMM yyyy")}
                </time>
              </p>
            </div>
          </div>
          <p className="mt-6 text-gray-500">{product.description}</p>
          <div className="grid grid-cols-1 mt-10 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Form method="post">
              <fieldset disabled={!!pendingForm}>
                <input type="hidden" name="variantId" value={variantId} />
                <button
                  type="submit"
                  className="flex items-center justify-center w-full px-8 py-3 text-base font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-gray-500"
                >
                  {pendingForm && (
                    <svg
                      className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  <span>
                    Pay{" "}
                    {formatMoney(
                      Number(product.priceRange.minVariantPrice.amount)
                    )}
                  </span>
                </button>
              </fieldset>
            </Form>
            <button
              type="button"
              className="flex items-center justify-center w-full px-8 py-3 text-base font-medium text-gray-900 bg-white border rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-gray-500"
            >
              Preview
            </button>
          </div>
          <div className="pt-10 sm:border-t sm:mt-10">
            <h3 className="text-sm font-medium text-gray-900">License</h3>
            <p className="mt-4 text-sm text-gray-500">
              For personal and professional use. You cannot resell or
              redistribute these icons in their original or modified state.{" "}
              <a
                href="#"
                className="font-medium text-gray-900 hover:text-gray-700"
              >
                Read full license
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto mt-24 lg:mt-32 lg:max-w-none">
        <div className="flex items-center justify-between space-x-4">
          <h2 className="text-lg font-medium text-gray-900">
            Customers also viewed
          </h2>
          <Link
            className="text-sm font-medium text-gray-900 whitespace-nowrap hover:text-gray-700"
            to="/"
          >
            View all<span aria-hidden="true"> →</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 mt-6 gap-x-8 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-4">
          {relatedProducts.map((relatedProduct) => {
            let product = relatedProduct.node;
            const image = product.images.edges[0].node;

            return (
              <div className="relative group" key={product.handle}>
                <div className="overflow-hidden bg-gray-100 rounded-lg aspect-w-4 aspect-h-3">
                  <img
                    src={image.transformedSrc}
                    className="object-cover object-center group-hover:opacity-75"
                    alt={image.altText ?? ""}
                  />
                </div>
                <div className="flex items-center justify-between mt-4 space-x-8 text-base font-medium text-gray-900">
                  <h3>
                    <Link to={`/products/${product.handle}`}>
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.title}
                    </Link>
                  </h3>
                  <p>
                    {formatMoney(
                      Number(product.priceRange.minVariantPrice.amount)
                    )}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {product.tags.join(", ")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default ProductPage;
export { action, headers, loader, meta };
